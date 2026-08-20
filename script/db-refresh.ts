import "../server/load-env";
import { existsSync, mkdirSync, statSync } from "fs";
import path from "path";
import {
  adminUrlFor,
  databaseNameOf,
  exe,
  fail,
  psqlQuery,
  requireLocalDatabaseUrl,
  resolvePgBin,
  run,
} from "./pg-util";

/**
 * Re-dumps the production database and restores it into the local one.
 *
 * `pg_dump` only reads, so production is never modified. Everything destructive
 * happens against the local target, which is why `requireLocalDatabaseUrl`
 * refuses to proceed when DATABASE_URL is not a loopback host.
 *
 * This exists as a script rather than documented commands because the manual
 * form has three traps that are easy to hit and hard to diagnose:
 *   - PostgreSQL's Windows getopt stops parsing options at the first non-option
 *     argument, so `pg_dump <url> --schema=public` silently treats every later
 *     flag as positional. Passing argv as an array with options first makes the
 *     ordering structural.
 *   - Reading PROD_DATABASE_URL through a subprocess picks up dotenv v17's
 *     stdout banner. Here the value is read in-process.
 *   - The PG binaries are not on PATH on Windows.
 */

const DUMP_DIR = "db-snapshots";
const DUMP_FILE = path.join(DUMP_DIR, "prod-snapshot.dump");

/**
 * analytics_events is ~4.1M rows and ~815 MB of the ~835 MB database. Pulling it
 * over the network from Neon reliably fails partway through:
 *   pg_dump: error: Dumping the contents of table "analytics_events" failed:
 *            PQgetCopyData() failed. server closed the connection unexpectedly
 * Skipping its *data* still creates the table and its indexes, so the app and the
 * admin dashboard work — the dashboard just shows no historical events — and the
 * dump shrinks to a few MB. Pass --with-analytics when that history is needed.
 */
const HEAVY_TABLE = "public.analytics_events";

const args = process.argv.slice(2);
const reuseDump = args.includes("--reuse-dump");
const withAnalytics = args.includes("--with-analytics");

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: npm run db:refresh [-- --reuse-dump] [-- --with-analytics]

  Dumps the production database (read-only) and restores it into the local one.

  --reuse-dump      Skip the dump and restore from the existing ${DUMP_FILE}.
                    Useful when iterating; avoids re-pulling the snapshot.

  --with-analytics  Include ${HEAVY_TABLE} row data. Excluded by default:
                    it is ~815 MB of the ~835 MB total and the transfer from
                    Neon regularly drops mid-dump. The table itself is always
                    created either way.

  PG_BIN            Override the PostgreSQL client directory.
`);
  process.exit(0);
}

const unknown = args.filter(
  (a) => !["--reuse-dump", "--with-analytics", "--help", "-h"].includes(a),
);
if (unknown.length) {
  console.error(`Unknown option(s): ${unknown.join(", ")}\nTry: npm run db:refresh -- --help`);
  process.exit(1);
}

async function main(): Promise<void> {
  const started = Date.now();

  const prodRaw = process.env.PROD_DATABASE_URL;
  if (!prodRaw) fail("PROD_DATABASE_URL is not set. It lives in .env (git-ignored).");
  let prodUrl: URL;
  try {
    prodUrl = new URL(prodRaw);
  } catch {
    fail("PROD_DATABASE_URL is not a valid URL.");
  }

  const localUrl = requireLocalDatabaseUrl();
  const pgBin = resolvePgBin();
  const targetDb = databaseNameOf(localUrl);
  const adminUrl = adminUrlFor(localUrl);

  console.log(`  client : ${pgBin}`);
  console.log(`  source : ${prodUrl.hostname} (read-only)`);
  console.log(`  target : ${localUrl.hostname}:${localUrl.port || 5432}/${targetDb}`);
  console.log("");

  const exists = psqlQuery(
    pgBin,
    adminUrl,
    `SELECT 1 FROM pg_database WHERE datname = '${targetDb.replace(/'/g, "''")}'`,
  );
  if (exists === null) {
    fail(
      `Could not reach the local PostgreSQL server at ${localUrl.hostname}:${localUrl.port}.\n` +
        `  The project cluster is not a system service, so it does not start on boot.\n` +
        `  Run: npm run db:setup`,
    );
  }
  if (exists !== "1") {
    console.log(`→ creating database ${targetDb}`);
    run(
      exe(pgBin, "psql"),
      ["-X", "-w", "-d", adminUrl.toString(), "-c", `CREATE DATABASE "${targetDb}"`],
      "createdb",
    );
  }

  if (reuseDump) {
    if (!existsSync(DUMP_FILE)) fail(`--reuse-dump given but ${DUMP_FILE} does not exist.`);
    console.log(`→ reusing existing dump (${(statSync(DUMP_FILE).size / 1024 / 1024).toFixed(0)} MB)`);
  } else {
    mkdirSync(DUMP_DIR, { recursive: true });
    console.log(
      withAnalytics
        ? `→ dumping production including ${HEAVY_TABLE} (~815 MB, may drop mid-transfer)…`
        : `→ dumping production (read-only; ${HEAVY_TABLE} rows excluded)…`,
    );
    // Options BEFORE -d: PostgreSQL's Windows getopt stops at the first
    // non-option argument, so a bare connection string first would swallow them.
    run(
      exe(pgBin, "pg_dump"),
      [
        "--schema=public",
        "--no-owner",
        "--no-privileges",
        "--no-comments",
        ...(withAnalytics ? [] : [`--exclude-table-data=${HEAVY_TABLE}`]),
        "-Fc",
        "-f",
        DUMP_FILE,
        "-d",
        prodUrl.toString(),
      ],
      "pg_dump",
    );
    console.log(`  dump written: ${(statSync(DUMP_FILE).size / 1024 / 1024).toFixed(1)} MB`);
  }

  console.log(`→ restoring into ${targetDb}…`);
  // --clean --if-exists so repeat runs replace cleanly instead of colliding on
  // objects that already exist.
  run(
    exe(pgBin, "pg_restore"),
    [
      "--no-owner",
      "--no-privileges",
      "--clean",
      "--if-exists",
      "-j",
      "4",
      "-d",
      localUrl.toString(),
      DUMP_FILE,
    ],
    "pg_restore",
  );

  // Read the result back rather than assuming the restore worked.
  const summary = psqlQuery(
    pgBin,
    localUrl,
    `SELECT relname || '  ' || n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 8`,
  );
  const tableCount = psqlQuery(
    pgBin,
    localUrl,
    `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`,
  );

  const elapsed = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`\n✓ restored ${tableCount ?? "?"} tables in ${elapsed}s`);
  if (summary) {
    console.log("  largest tables (estimates):");
    for (const line of summary.split("\n")) console.log(`    ${line}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
