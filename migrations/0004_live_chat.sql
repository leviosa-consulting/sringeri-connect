CREATE TABLE IF NOT EXISTS chat_conversations (
  id serial PRIMARY KEY NOT NULL,
  visitor_id text NOT NULL,
  od_user_id text,
  name text,
  email text,
  phone text,
  status text DEFAULT 'bot' NOT NULL,
  source text DEFAULT 'app' NOT NULL,
  assigned_agent_uid text,
  assigned_agent_name text,
  unread_for_agent integer DEFAULT 0 NOT NULL,
  unread_for_visitor integer DEFAULT 0 NOT NULL,
  last_message_at timestamp DEFAULT now() NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  closed_at timestamp
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id serial PRIMARY KEY NOT NULL,
  conversation_id integer NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  author text NOT NULL,
  author_name text,
  content text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_conversations_visitor_idx ON chat_conversations (visitor_id);
CREATE INDEX IF NOT EXISTS chat_conversations_status_idx ON chat_conversations (status);
CREATE INDEX IF NOT EXISTS chat_conversations_last_message_idx ON chat_conversations (last_message_at);
CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx ON chat_messages (conversation_id, id);
