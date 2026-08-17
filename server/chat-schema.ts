import pg from "pg";

/**
 * Idempotent DDL for the Live Chat tables.
 *
 * Like the daily-practice tables, this project provisions its schema with
 * `drizzle-kit push` rather than by running the files in `migrations/`, so the
 * statements run at startup and a deployed environment picks the tables up
 * without a manual push. Every statement is `IF NOT EXISTS`, so this is a no-op
 * once the schema is in place. `migrations/0004_live_chat.sql` mirrors this
 * list for anyone provisioning a database from the SQL files; keep the two in
 * step when the chat tables change.
 */
export const LIVE_CHAT_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS chat_conversations (
    id serial PRIMARY KEY NOT NULL,
    visitor_id text NOT NULL,
    od_user_id text,
    name text,
    email text,
    phone text,
    status text DEFAULT 'bot' NOT NULL,
    source text DEFAULT 'app' NOT NULL,
    page_url text,
    page_title text,
    assigned_agent_uid text,
    assigned_agent_name text,
    unread_for_agent integer DEFAULT 0 NOT NULL,
    unread_for_visitor integer DEFAULT 0 NOT NULL,
    last_message_at timestamp DEFAULT now() NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    closed_at timestamp
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id serial PRIMARY KEY NOT NULL,
    conversation_id integer NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    author text NOT NULL,
    author_name text,
    content text NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS chat_conversations_visitor_idx ON chat_conversations (visitor_id)`,
  `CREATE INDEX IF NOT EXISTS chat_conversations_status_idx ON chat_conversations (status)`,
  `CREATE INDEX IF NOT EXISTS chat_conversations_last_message_idx ON chat_conversations (last_message_at)`,
  `CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx ON chat_messages (conversation_id, id)`,
  // CREATE TABLE IF NOT EXISTS is a no-op once the table already exists, so
  // columns added after the table's first release need their own ALTERs here.
  `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS page_url text`,
  `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS page_title text`,
  `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS subject text`,
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_mime text`,
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_size integer`,
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_name text`,
  // Attachment bytes live apart from the transcript so reading a conversation
  // never drags base64 payloads along with it.
  `CREATE TABLE IF NOT EXISTS chat_attachments (
    id serial PRIMARY KEY NOT NULL,
    message_id integer NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    conversation_id integer NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL,
    data text NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS chat_attachments_message_idx ON chat_attachments (message_id)`,
];

export async function ensureLiveChatSchema(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    for (const statement of LIVE_CHAT_DDL) {
      await client.query(statement);
    }
  } finally {
    await client.end();
  }
}
