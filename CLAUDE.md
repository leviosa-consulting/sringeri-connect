# CLAUDE.md

Working guidelines for this repository. **Architecture, features and external API details
live in [replit.md](replit.md)** — this file covers how to run, change and ship the project,
and the rules that are easy to get wrong.

## Where things are documented

| File | Covers |
|---|---|
| [replit.md](replit.md) | Architecture, feature list, external APIs, project structure |
| [docs/DATABASE_LOG.md](docs/DATABASE_LOG.md) | **Every database structure change.** Mandatory — see [Database](#database) |
| [.agents/memory/](.agents/memory/) | Feature-specific gotchas (daily practice, live chat, chatbot widget, admin corrections) |
| [PAYTM_SEVA_INTEGRATION.md](PAYTM_SEVA_INTEGRATION.md) | Paytm checksum + callback flow |
| [docs/live-chat-embed.md](docs/live-chat-embed.md) | Website embed widget |

## Two environments

The project runs on Replit (deployment target) and locally on Windows. Both must keep
working — do not "fix" one by breaking the other.

| | Replit | Local |
|---|---|---|
| Secrets | Injected as real env vars; `.replit [userenv.shared]` holds the non-secret ones | Read from `.env` via [server/load-env.ts](server/load-env.ts) |
| Database | Neon Postgres 16.14, schema auto-pushed on deploy | Dedicated Postgres 16 cluster on port **5544**, restored from a prod dump |
| `reusePort` | Supported | **Not supported** — Windows throws `listen ENOTSUP`, so it is platform-guarded in [server/index.ts](server/index.ts) |
| Shell | POSIX | cmd.exe — npm scripts use `cross-env` so `NODE_ENV=...` prefixes work in both |

## First-time local setup

**Prerequisite:** install **PostgreSQL 16**. It supplies `initdb`, `pg_ctl`, `psql`,
`pg_dump` and `pg_restore`. Production runs 16.14, and a version-matched client is what keeps
dump/restore free of skew. On Windows the binaries are not added to `PATH`; the scripts look
in `C:/Program Files/PostgreSQL/16/bin` and honour `PG_BIN` if yours lives elsewhere.

Then:

1. **`.env`** — copy `.env.example` to `.env` and fill it in. It is git-ignored and the values
   are secrets, so get them from the team; they are not in the repo.
2. **`npm install`**
3. **`npm run db:setup`** — creates the local PostgreSQL cluster, starts it, and creates the
   database. Safe to re-run.
4. **`npm run db:refresh`** — dumps production (read-only) and loads a copy locally.
5. **`npm run dev`**

Two entries in `.env.example` are specific to one machine rather than to the project:

- `PORT` — only set here because another app already occupies 5000. Leave it unset and the
  server uses 5000.
- `DATABASE_URL` uses port 5544 purely to stay clear of existing PostgreSQL services. Any free
  port works; `db:setup` reads the port from that URL.

If you need Google or Apple sign-in locally, the host you serve from must also be listed under
Firebase Console → Authentication → Settings → Authorized domains. Email/password and guest
sign-in work without that.

## Commands

| Command | Notes |
|---|---|
| `npm run dev` | **The entry point.** Express + Vite middleware on port 5001 (from `PORT` in `.env`, default 5000) |
| `npm run check` | TypeScript typecheck (`tsc`). **Currently fails with 15 pre-existing errors** — see Gotchas |
| `npm run build` | Vite client → `dist/public`, esbuild server → `dist/index.cjs` |
| `npm start` | Runs the production bundle |
| `npm run db:push` | Drizzle push. **Check what `DATABASE_URL` points at first** |
| `npm run db:setup` | Create the local PostgreSQL cluster, start it, create the database. Idempotent — also how you restart the cluster after a reboot |
| `npm run db:refresh` | Re-dump prod and restore it into the local database. Read-only against prod; refuses to run if `DATABASE_URL` is not local. Add `-- --reuse-dump` to restore the existing snapshot without re-downloading |
| `npm run dev:client` | Vestigial. Its hardcoded `--port 5000` is now stale too, and it is redundant since [server/vite.ts](server/vite.ts) already mounts Vite as Express middleware. Use `npm run dev`. |

## Environment variables

All server secrets are read from `process.env`. Locally they come from `.env`; on Replit
they are injected. `.env` is git-ignored — never commit it, and keep `.env.example` in step
when adding a key.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | **Local restored copy only.** See the warning below |
| `PROD_DATABASE_URL` | Production Neon. Used **only** for `pg_dump`; no application code reads it |
| `SESSION_SECRET` | express-session |
| `SRINGERI_API_KEY` | `X-API-Key` for the external Sringeri API |
| `PAYTM_MID` / `PAYTM_MERCHANT_KEY` | Regular MID |
| `PAYTM_MID_SPCT` / `PAYTM_MERCHANT_KEY_SPCT` | 80G donations |
| `GOOGLE_TRANSLATE_API_KEY` | Transliteration/translation endpoint |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | nodemailer |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin. One line; the escaped newlines in `private_key` must stay as literal backslash-n so `JSON.parse` produces the real newlines |
| `VITE_FIREBASE_*`, `VITE_SRINGERI_API_URL`, `VITE_ANALYTICS_ADMIN_UIDS` | Client-side; exposed in the browser bundle, so non-secret only |

Two quoting rules for `.env`, both already load-bearing:

- `PAYTM_MERCHANT_KEY` contains `#`. Unquoted, every `.env` parser truncates it there and
  Paytm checksums silently break. Keep values single-quoted.
- `FIREBASE_SERVICE_ACCOUNT_JSON` must use **single** quotes. Double quotes make dotenv
  expand the escaped newlines into real ones, which corrupts the JSON.

`server/load-env.ts` must remain the **first** import in `server/index.ts`.
[server/chatbot.ts](server/chatbot.ts), [server/email-service.ts](server/email-service.ts)
and [server/reconciliation-service.ts](server/reconciliation-service.ts) read `process.env`
at module scope, and ESM evaluates imports before any statement in the importing file — so
loading env any later is too late.

## Database

### How schema actually gets applied

There is **no migration runner**. [server/daily-schema.ts](server/daily-schema.ts) explains
why: the project provisions with `drizzle-kit push`, and the `__drizzle_migrations`
bookkeeping table has never existed in any environment, so `drizzle-kit migrate` cannot be
adopted retroactively without it trying to re-create every existing table.

Schema therefore arrives through three routes:

1. **[shared/schema.ts](shared/schema.ts)** — Drizzle definitions. Source of truth for the
   ORM and generated types.
2. **`drizzle-kit push`** — how it reaches a database. Replit runs this automatically on
   deploy (tracked in `_system.replit_database_migrations_v1`, which records *that* a push
   happened but never *what* changed).
3. **Boot-time idempotent DDL** — `DAILY_PRACTICE_DDL` in
   [server/daily-schema.ts](server/daily-schema.ts) and `LIVE_CHAT_DDL` in
   [server/chat-schema.ts](server/chat-schema.ts), executed on every startup from
   [server/index.ts](server/index.ts) against whatever `DATABASE_URL` names.

**[migrations/](migrations/) is historical only.** No migrator reads it and its journal is
already out of sync (`0004_live_chat.sql` is absent from `meta/_journal.json`). Do not add
files there — use the database log instead.

### Rule: every structural change gets logged

Any change to database structure — new table, new column, index, constraint, type change —
must do all of these:

1. Update [shared/schema.ts](shared/schema.ts).
2. If it touches a daily-practice or chat table, mirror the statement into
   `DAILY_PRACTICE_DDL` / `LIVE_CHAT_DDL` so boot-time provisioning stays in step.
3. **Append an entry to [docs/DATABASE_LOG.md](docs/DATABASE_LOG.md)** with the exact SQL.

Step 3 is what makes a change reproducible in the other environment. Write the SQL
idempotently (`IF NOT EXISTS` / `IF EXISTS`), matching the existing house style, so
re-running an entry is always safe.

### Never point DATABASE_URL at production

Local `DATABASE_URL` must always name the **local restored copy**. Both the boot-time DDL
and `npm run db:push` execute against whatever it names — pointing it at prod means an
ordinary local startup can alter the production schema.

`PROD_DATABASE_URL` exists solely so `pg_dump` can read prod. Nothing writes to prod from a
local machine.

### The local database

Local development uses a **dedicated Postgres 16 cluster** created for this project, not the
Windows Postgres services:

| | |
|---|---|
| Data directory | `$PGDATA_DIR`, or `<your home>/pgdata-sringeri` by default |
| Port, role, database | taken from `DATABASE_URL` — that URL is the single source of truth |
| Auth | `trust` — **no password**, loopback connections only |

`npm run db:setup` creates it with `initdb --auth=trust`, which needs no administrator rights
and leaves any system-wide PostgreSQL installation untouched. `trust` is acceptable here
because the cluster only accepts loopback connections and holds nothing but a disposable copy
of prod.

It is **not** a system service, so it does not start with the machine. `db:setup` is
idempotent — re-running it is how you start the cluster again after a reboot:

```
npm run db:setup
```

It skips `initdb` when a cluster already exists, skips the start when the server is already
listening, and skips the CREATE when the database exists, so it never touches existing data.

To drive the cluster directly:

```bash
PGBIN="/c/Program Files/PostgreSQL/16/bin"
DATA="$PGDATA_DIR"   # or ~/pgdata-sringeri

"$PGBIN/pg_ctl.exe" -D "$DATA" status                                     # check
"$PGBIN/pg_ctl.exe" -D "$DATA" stop                                       # stop
```

Connect with `"$PGBIN/psql.exe" -h 127.0.0.1 -p 5544 -U postgres -d sringeri_local`.

### Refreshing local data from prod

```
npm run db:refresh
```

That is the whole procedure. It works from PowerShell, cmd and Git Bash alike. It dumps
production (**read-only** — nothing is ever written to prod), creates the local database if
it is missing, restores over it, and prints a row-count summary read back from the result.

Add `-- --reuse-dump` to restore the snapshot already on disk without re-downloading it:

```
npm run db:refresh -- --reuse-dump
```

**`analytics_events` row data is excluded by default.** That one table is ~4.1M rows and
~815 MB of the ~835 MB database, and pulling it from Neon reliably died partway through with
`PQgetCopyData() failed: server closed the connection unexpectedly`. Excluding its rows takes
the snapshot from 835 MB to **3 MB** and turns a failing transfer into a ~2 minute one. The
table and its indexes are still created, so the app and the admin dashboard work — the
dashboard simply shows no historical events. Pass `-- --with-analytics` when you genuinely
need that history, and expect it to be slow and failure-prone.

Before doing anything, the script **refuses to run unless `DATABASE_URL` names a loopback
host**. It drops and replaces the target database, so this gate is what stops a mispointed
`DATABASE_URL` from being destructive. Set `PG_BIN` if your PostgreSQL client lives somewhere
other than `C:/Program Files/PostgreSQL/16/bin`.

#### Doing it by hand (Git Bash)

Only needed if the script is unavailable or you want a variant. **These are Git Bash
commands** — they will not run in PowerShell, which is what `npm run db:refresh` above is
for. Prod is Postgres 16.14, so use the **PG 16** client for an exact version match; the
binaries are not on `PATH`.

```bash
PGBIN="/c/Program Files/PostgreSQL/16/bin"
URL=$(grep '^PROD_DATABASE_URL=' .env | tr -d '\r' | sed "s/^PROD_DATABASE_URL='//; s/'$//")
mkdir -p db-snapshots

# 1. Dump prod's public schema (skips Replit's _system schema)
"$PGBIN/pg_dump.exe" --schema=public --no-owner --no-privileges --no-comments \
  -Fc -f db-snapshots/prod-snapshot.dump -d "$URL"

# 2. Restore (add --clean --if-exists when overwriting an existing copy)
"$PGBIN/pg_restore.exe" --no-owner --no-privileges -j 4 \
  -h 127.0.0.1 -p 5544 -U postgres -d sringeri_local \
  db-snapshots/prod-snapshot.dump
```

Two traps the script removes by construction, which you must handle yourself here — this is
why `script/db-refresh.ts` exists:

- **Options must come before `-d`.** PostgreSQL's Windows `getopt` stops parsing at the
  first non-option argument, so a bare connection string in front makes every following
  flag a positional argument and `pg_dump` fails with "too many command-line arguments".
- **Never capture `PROD_DATABASE_URL` via `node -e "require('dotenv').config()"`** — dotenv
  v17 writes a banner to stdout that ends up inside the captured value. Read `.env` directly,
  as above.

Snapshots are git-ignored via `db-snapshots/` and `*.dump`. Keep it that way — a full dump
including `analytics_events` is ~835 MB and could not be committed regardless, since GitHub
rejects files over 100 MB.

## Code conventions

Match the surrounding code. Observable house style:

- Comments explain **why**, not what — see the maintenance gate and body-parser notes in
  [server/index.ts](server/index.ts), or the unique-index rationale in
  [server/daily-schema.ts](server/daily-schema.ts).
- DDL is always idempotent, so startup is a no-op once a schema is in place.
- Server routes proxy the external Sringeri API and forward `X-API-Key` when present.
- Client uses TanStack Query for server state, Wouter for routing, shadcn/ui components.

## Gotchas

### After pulling work from Replit

Two things recur every time, because Replit's environment differs from a local checkout.

- **`package-lock.json` picks up Replit's internal package proxy.** Anything installed on
  Replit is recorded as `http://package-firewall.replit.local/npm/...`, a host that does not
  resolve anywhere else, so `npm install` fails locally with `ENOTFOUND`. Fix by rewriting
  them to the canonical registry:
  ```bash
  sed -i 's|http://package-firewall\.replit\.local/npm/|https://registry.npmjs.org/|g' package-lock.json
  ```
  This is safe for Replit — npm's `replace-registry-host` defaults to `npmjs`, so canonical
  URLs are routed back through their proxy there, which is why the ~800 pre-existing
  registry.npmjs.org entries have always worked. Seen so far with `nodemailer` and
  `dompurify`.
- **Dependency conflicts are usually false conflicts.** A `git stash pop` or merge tends to
  collide on *adjacent alphabetical insertions* in `package.json` — e.g. upstream adding
  `dompurify` while local work adds `dotenv`, both landing between `date-fns` and
  `drizzle-orm`. **Keep both sides.** For `package-lock.json`, do not hand-merge: its
  conflicts span `node_modules/*` objects that share closing braces. Take upstream's copy
  (`git checkout --ours package-lock.json`), then let `npm install` re-add the local
  dependencies from the resolved `package.json`.

Symptom if you skip this: `npm run dev` fails instantly with a JSON parse error, because npm
cannot read a `package.json` that still contains `<<<<<<<` markers.

### General

- **Postgres binaries are not on `PATH`** — use `C:\Program Files\PostgreSQL\16\bin\`.
  Three clusters exist on this machine: the PG 16 service (5432), the PG 18 service (5433),
  and this project's own cluster (5544). Only 5544 is used by the app.
- **The project cluster is not a service** — after a reboot, `pg_ctl ... start` it before
  `npm run dev`, or the server logs a connection error and falls back to failing DDL.
- **Locally this app runs on port 5001, not 5000** — `PORT='5001'` in `.env`. Do not "tidy"
  it back to 5000: this machine runs an unrelated Next.js app bound to `[::]:5000`, and two
  problems follow from sharing that port. First, if that app is up, `npm run dev` dies with
  `EADDRINUSE` (the listen-error handler in [server/index.ts](server/index.ts) exits the
  process). Second, even when both bind successfully — ours on `0.0.0.0`, theirs on `::` —
  Windows resolves `localhost` to `::1` first, so `http://localhost:5000` silently serves
  the *other* app: a stranger's page, and `/api/health` returning 404 while our log happily
  says "serving on port 5000". Replit is unaffected; it sets its own `PORT=5000` in
  `.replit`, which the local `.env` never reaches.
- **Kill stray dev servers.** Stopping the `npm run dev` wrapper does not always kill its
  `tsx server/index.ts` child, which keeps holding the port and makes the next start fail
  with `EADDRINUSE`. Check with
  `Get-NetTCPConnection -LocalPort 5001 -State Listen` and match the PID's command line
  before killing it.
- **`reusePort`** must stay platform-guarded in [server/index.ts](server/index.ts).
- **Vite `envDir`** is pinned to the repo root in [vite.config.ts](vite.config.ts). Because
  `root` is `client/`, the default would look for `client/.env` and the root `.env` would
  never reach the client bundle.
- The production bundle inlines `process.env.NODE_ENV` as `"production"` at build time via
  the esbuild `define` in [script/build.ts](script/build.ts).
- **`npm run check` fails on `main`** with 15 pre-existing errors, so it is not a usable
  regression gate as-is. Eleven are `--downlevelIteration` complaints caused by
  [tsconfig.json](tsconfig.json) setting no `target` (TypeScript then defaults to ES5 while
  `lib` is esnext); adding `"target": "ES2022"` clears them, and `noEmit` means it affects
  typechecking only. The other four are real: `toast` is called but never imported in
  `client/src/pages/donation.tsx`, and two implicit-`any` parameters in `server/routes.ts`.
  `npm run build` is unaffected — esbuild and Vite do not typecheck.
