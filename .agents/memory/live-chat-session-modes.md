---
name: Live chat session mode routing (team-first default)
description: How new chat sessions choose between team, bot, and email — the needsChoice contract shared by the in-app widget and website embed.
---

`POST /api/live-chat/session` accepts a `mode` field (`"team"` default | `"bot"` | `"email"`) that only matters for **brand-new** conversations — a visitor with an existing non-closed conversation always resumes it unchanged regardless of `mode`.

For a new conversation:
- `mode: "team"` (default) checks `getAgentPresence()`. Online → conversation is created directly as `waiting` (bot is skipped). Offline → the server does **not** create a conversation; it returns `{ needsChoice: true, agentOnline: false }` so the client can offer a choice.
- `mode: "bot"` always creates a `bot`-status conversation with the greeting, regardless of presence.
- `mode: "email"` validates `email`/`concern`, creates the conversation directly as `offline_pending`, and sends the same acknowledgement/support emails as the offline branch of `request-agent`.

**Why:** The user wants new chats to reach a human by default, with the AI bot and "email us" only offered as an explicit fallback when the team is offline — not the old default-to-bot behavior. The `needsChoice` contract keeps that decision server-side so the in-app widget (`client/src/components/chatbot-widget.tsx`) and the website embed (`client/public/embed/live-chat.js`, vanilla JS in a shadow root) can render the same choice screen consistently.

**How to apply:** When touching chat session creation, keep both clients in sync — they duplicate the choice-screen UI (bot vs. email buttons, inline pre-chat email form) independently since the embed can't share React components with the app. The existing mid-bot-chat "Talk to a person" escalation (`POST /api/live-chat/request-agent`) is a separate, untouched code path with its own duplicated online/offline logic — see the tech-debt follow-up task for unifying it with `/session`.

Unrelated but adjacent lesson from this same work: the idempotent startup DDL in `server/routes.ts` must be updated in lockstep with any new Drizzle column added to `server/chat-schema.ts` — adding a column to the schema/storage layer without also adding it to the `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` startup list causes live `column does not exist` errors even though local dev (which may have run migrations manually) looks fine.
