/**
 * Loads the repo-root `.env` into `process.env` for local development.
 *
 * This must be the FIRST import in `server/index.ts`. Several modules read
 * `process.env` at module scope (server/chatbot.ts, server/email-service.ts,
 * server/reconciliation-service.ts), and ESM evaluates every import before any
 * statement in the importing file — so loading env from inside a function, or
 * from a later import, would run too late.
 *
 * On Replit there is no `.env`; secrets arrive as real environment variables.
 * dotenv does not overwrite variables that are already set, so this is a no-op
 * there and injected secrets always win.
 *
 * `quiet` suppresses dotenv v17's startup banner, which is written to stdout
 * and otherwise corrupts anything that captures a command's output.
 */
import { config } from "dotenv";

config({ quiet: true });
