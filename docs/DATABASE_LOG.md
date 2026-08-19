# Database Log

Every change to database **structure** is recorded here as runnable SQL, so a change made in
one environment can be replayed in the others.

## Why this file exists

This project has no migration runner. As
[server/daily-schema.ts](../server/daily-schema.ts) explains, schema is provisioned with
`drizzle-kit push`, and the `__drizzle_migrations` bookkeeping table has never existed in any
environment — so `drizzle-kit migrate` cannot be adopted retroactively without it trying to
re-create every existing table.

That leaves no record of *what* changed. Replit's `_system.replit_database_migrations_v1`
logs that a push happened and how many statements ran, but never the statements themselves.
[migrations/](../migrations/) is a hand-written mirror that no migrator reads and that has
already drifted (`0004_live_chat.sql` is missing from `meta/_journal.json`).

**This file is that record.** Do not add new files to `migrations/`.

## Rules

1. **Every** structural change gets an entry: new table, new column, index, constraint,
   default, or type change. Data-only fixes do not.
2. Add the entry in the **same change** as the code, never afterwards.
3. Write SQL **idempotently** — `IF NOT EXISTS` / `IF EXISTS` — matching the house style in
   [server/daily-schema.ts](../server/daily-schema.ts). Re-running an entry must always be
   safe.
4. Append to the **bottom**. The file reads top-to-bottom in the order changes should be
   applied.
5. Also update [shared/schema.ts](../shared/schema.ts), and mirror the statement into
   `DAILY_PRACTICE_DDL` / `LIVE_CHAT_DDL` if it touches a daily-practice or chat table —
   those run at every startup and must stay in step.
6. Tick the **Applied** boxes as each environment gets the change.

## Applying an entry

**Local** (Postgres 16 on port 5432; binaries are not on `PATH`):

```bash
"/c/Program Files/PostgreSQL/16/bin/psql.exe" \
  -h localhost -p 5432 -U postgres -d sringeri_local \
  -c "<the SQL>"
```

**Replit / production:** run the SQL in the Replit or Neon SQL console. In most cases a
deploy also applies it automatically, because Replit runs `drizzle-kit push` from
[shared/schema.ts](../shared/schema.ts) — the entry here is the durable record and the way to
apply it without a deploy.

Never run these against production from a local machine unless that is explicitly the
intent; `DATABASE_URL` locally must always name the local restored copy.

---

## Baseline — 2026-08-19

Schema as it stood when the project moved to GitHub: 22 tables in `public`, defined in
[shared/schema.ts](../shared/schema.ts).

A local database is provisioned by **restoring a production dump** (see the "Refreshing local
data" section of [CLAUDE.md](../CLAUDE.md)), not by replaying this log from empty. The
existing schema is therefore not back-filled below.

Entries after this point record changes made **after** 2026-08-19.

---

<!-- New entries go below this line, newest at the bottom. -->

---

## Template — copy this for a new entry

````markdown
## YYYY-MM-DD — short title

**Why:** the reason the change was needed, not a restatement of the SQL.
**Code touched:** shared/schema.ts, server/daily-schema.ts
**Applied:** [ ] local  [ ] replit  [ ] prod

```sql
ALTER TABLE some_table
  ADD COLUMN IF NOT EXISTS some_column text;

CREATE INDEX IF NOT EXISTS some_table_some_column_idx
  ON some_table (some_column);
```
````
