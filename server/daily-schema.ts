import pg from "pg";

/**
 * Idempotent DDL for the daily-practice tables (Guruvani, Question of the Day,
 * Activity of the Day and the Dharma Points ledger).
 *
 * This project provisions its schema with `drizzle-kit push` rather than by
 * running the files in `migrations/` — the drizzle migration bookkeeping table
 * has never existed in any environment, so the migrator cannot be turned on
 * retrospectively without it trying to re-create every pre-existing table.
 *
 * These statements therefore run at startup so a deployed environment gets the
 * tables without a manual push. Every statement is `IF NOT EXISTS`, so this is
 * a no-op once the schema is in place. `migrations/0003_daily_practice.sql`
 * mirrors this list for anyone provisioning a database from the SQL files;
 * keep the two in step when the daily tables change.
 */
export const DAILY_PRACTICE_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS daily_guruvani (
    id serial PRIMARY KEY NOT NULL,
    content_date date NOT NULL,
    quote text NOT NULL,
    attribution text,
    points integer DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS daily_questions (
    id serial PRIMARY KEY NOT NULL,
    content_date date NOT NULL,
    question_text text NOT NULL,
    options jsonb NOT NULL,
    correct_index integer NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    explanation text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS daily_activities (
    id serial PRIMARY KEY NOT NULL,
    content_date date NOT NULL,
    activity_type text DEFAULT 'anagram' NOT NULL,
    answer_mode text DEFAULT 'text' NOT NULL,
    instructions text,
    prompt text NOT NULL,
    image_url text,
    options jsonb,
    correct_index integer,
    correct_answer text,
    points integer DEFAULT 2 NOT NULL,
    explanation text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,
  // Added after the initial table so environments created before this field
  // existed still get it — CREATE TABLE IF NOT EXISTS above is a no-op there.
  `ALTER TABLE daily_activities ADD COLUMN IF NOT EXISTS instructions text`,
  `CREATE TABLE IF NOT EXISTS daily_reflections (
    id serial PRIMARY KEY NOT NULL,
    od_user_id text NOT NULL,
    content_date date NOT NULL,
    guruvani_id integer,
    reflection_text text NOT NULL,
    points_awarded integer DEFAULT 0 NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS daily_question_responses (
    id serial PRIMARY KEY NOT NULL,
    od_user_id text NOT NULL,
    content_date date NOT NULL,
    question_id integer NOT NULL REFERENCES daily_questions(id) ON DELETE CASCADE,
    selected_index integer NOT NULL,
    is_correct boolean NOT NULL,
    points_awarded integer DEFAULT 0 NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS daily_activity_responses (
    id serial PRIMARY KEY NOT NULL,
    od_user_id text NOT NULL,
    content_date date NOT NULL,
    activity_id integer NOT NULL REFERENCES daily_activities(id) ON DELETE CASCADE,
    submitted_answer text NOT NULL,
    is_correct boolean NOT NULL,
    points_awarded integer DEFAULT 0 NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dharma_points (
    id serial PRIMARY KEY NOT NULL,
    od_user_id text NOT NULL,
    source_type text NOT NULL,
    source_date date NOT NULL,
    source_id integer,
    points integer NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  )`,
  // Unique indexes are what make the "one submission, one award" guarantee
  // structural rather than a check in application code.
  `CREATE UNIQUE INDEX IF NOT EXISTS daily_guruvani_date_idx ON daily_guruvani (content_date)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS daily_questions_date_idx ON daily_questions (content_date)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS daily_activities_date_idx ON daily_activities (content_date)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS daily_reflections_user_date_idx ON daily_reflections (od_user_id, content_date)`,
  `CREATE INDEX IF NOT EXISTS daily_reflections_date_idx ON daily_reflections (content_date)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS daily_question_responses_user_date_idx ON daily_question_responses (od_user_id, content_date)`,
  `CREATE INDEX IF NOT EXISTS daily_question_responses_date_idx ON daily_question_responses (content_date)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS daily_activity_responses_user_date_idx ON daily_activity_responses (od_user_id, content_date)`,
  `CREATE INDEX IF NOT EXISTS daily_activity_responses_date_idx ON daily_activity_responses (content_date)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS dharma_points_user_source_idx ON dharma_points (od_user_id, source_type, source_date)`,
  `CREATE INDEX IF NOT EXISTS dharma_points_user_idx ON dharma_points (od_user_id)`,
];

export async function ensureDailyPracticeSchema(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    for (const statement of DAILY_PRACTICE_DDL) {
      await client.query(statement);
    }
  } finally {
    await client.end();
  }
}
