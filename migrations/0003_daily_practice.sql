-- Daily practice: Guruvani, Question of the Day, Activity of the Day and the
-- Dharma Points ledger. Mirrors server/daily-schema.ts, which applies the same
-- statements at startup; keep the two in step.

CREATE TABLE IF NOT EXISTS daily_guruvani (
    id serial PRIMARY KEY NOT NULL,
    content_date date NOT NULL,
    quote text NOT NULL,
    attribution text,
    points integer DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS daily_questions (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS daily_activities (
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
  );
--> statement-breakpoint
ALTER TABLE daily_activities ADD COLUMN IF NOT EXISTS instructions text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS daily_reflections (
    id serial PRIMARY KEY NOT NULL,
    od_user_id text NOT NULL,
    content_date date NOT NULL,
    guruvani_id integer,
    reflection_text text NOT NULL,
    points_awarded integer DEFAULT 0 NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS daily_question_responses (
    id serial PRIMARY KEY NOT NULL,
    od_user_id text NOT NULL,
    content_date date NOT NULL,
    question_id integer NOT NULL REFERENCES daily_questions(id) ON DELETE CASCADE,
    selected_index integer NOT NULL,
    is_correct boolean NOT NULL,
    points_awarded integer DEFAULT 0 NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS daily_activity_responses (
    id serial PRIMARY KEY NOT NULL,
    od_user_id text NOT NULL,
    content_date date NOT NULL,
    activity_id integer NOT NULL REFERENCES daily_activities(id) ON DELETE CASCADE,
    submitted_answer text NOT NULL,
    is_correct boolean NOT NULL,
    points_awarded integer DEFAULT 0 NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS dharma_points (
    id serial PRIMARY KEY NOT NULL,
    od_user_id text NOT NULL,
    source_type text NOT NULL,
    source_date date NOT NULL,
    source_id integer,
    points integer NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  );
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS daily_guruvani_date_idx ON daily_guruvani (content_date);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS daily_questions_date_idx ON daily_questions (content_date);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS daily_activities_date_idx ON daily_activities (content_date);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS daily_reflections_user_date_idx ON daily_reflections (od_user_id, content_date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS daily_reflections_date_idx ON daily_reflections (content_date);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS daily_question_responses_user_date_idx ON daily_question_responses (od_user_id, content_date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS daily_question_responses_date_idx ON daily_question_responses (content_date);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS daily_activity_responses_user_date_idx ON daily_activity_responses (od_user_id, content_date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS daily_activity_responses_date_idx ON daily_activity_responses (content_date);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS dharma_points_user_source_idx ON dharma_points (od_user_id, source_type, source_date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS dharma_points_user_idx ON dharma_points (od_user_id);
