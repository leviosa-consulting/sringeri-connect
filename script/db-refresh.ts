import "../server/load-env";
import { spawnSync } from "child_process";
import { existsSync, mkdirSync, statSync } from "fs";
import path from "path";

/**
 * Re-dumps the production database and restores it into the local one.
 *
 * `pg_dump` only reads, so production is never modified. Everything destructive
 * happens against the local target, which is why `assertLocalTarget` below
 * refuses to run when DATABASE_URL is not a loopback host.
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

// Prod is PostgreSQL 16.14; the version-matched client avoids dump/restore skew.
// PG 18 is also installed on this machine (port 5433) and is *not* what we want.
const PG_BIN_CANDIDATES = [
  process.env.PG_BIN,
  "C:/Program Files/PostgreSQL/16/bin",
  "/usr/lib/postgresql/16/bin",
  "/usr/local/opt/postgresql@16/bin",
].filter((p): p is string => !!p);

const args = process.argv.slice(2);
const reuseDump = args.includes("--reuse-dump");
const wantsHelp = args.includes("--help") || args.includes("-h");

if (wantsHelp) {
  console.log(`
Usage: npm run db:refresh [-- --reuse-dump]

  Dumps the production database (read-only) and restores it into the local one.

  --reuse-dump   Skip the dump and restore from the existing ${DUMP_FILE}.
                 Useful when iterating; avoids re-pulling the snapshot.

  PG_BIN         Override the PostgreSQL client directory.
`);
  process.exit(0);
}

const unknown = args.filter((a) => !["--reuse-dump", "--help", "-h"].includes(a));
if (unknown.length) {
  console.error(`Unknown option(s): ${unknown.join(", ")}\nTry: npm run db:refresh -- --help`);
  process.exit(1);
}

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function resolvePgBin(): string {
  const exe = process.platform === "win32" ? ".exe" : "";
  for (const dir of PG_BIN_CANDIDATES) {
    if (existsSync(path.join(dir, `pg_dump${exe}`))) return dir;
  }
  fail(
    `Could not find the PostgreSQL 16 client.\n` +
      `  Looked in:\n${PG_BIN_CANDIDATES.map((d) => `    ${d}`).join("\n")}\n` +
      `  Set PG_BIN to the directory containing pg_dump if it lives elsewhere.`,
  );
}

/**
 * The safety gate. This script restores *over* the target database, so a
 * DATABASE_URL pointing anywhere but the local machine would be destructive.
 */
function assertLocalTarget(url: URL): void {
  const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];
  if (!LOCAL_HOSTS.includes(url.hostname)) {
    fail(
      `Refusing to run: DATABASE_URL points at "${url.hostname}", not a local host.\n` +
        `  This script DROPS AND REPLACES the target database.\n` +
        `  DATABASE_URL must name your local copy (see "The local database" in CLAUDE.md).`,
    );
  }
}

function run(exe: string, argv: string[], label: string): void {
  const result = spawnSync(exe, argv, { stdio: ["ignore", "inherit", "inherit"] });
  if (result.error) fail(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} exited with code ${result.status}`);
}

/** Runs psql and returns stdout, or null when the command fails. */
function psqlQuery(pgBin: string, url: URL, sql: string): string | null {
  const exe = path.join(pgBin, process.platform === "win32" ? "psql.exe" : "psql");
  const result = spawnSync(exe, ["-X", "-w", "-At", "-d", url.toString(), "-c", sql], {
    encoding: "utf8",
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

async function main(): Promise<void> {
  const started = Date.now();

  const prodRaw = process.env.PROD_DATABASE_URL;
  const localRaw = process.env.DATABASE_URL;
  if (!prodRaw) fail("PROD_DATABASE_URL is not set. It lives in .env (git-ignored).");
  if (!localRaw) fail("DATABASE_URL is not set. It must name your local database.");

  let prodUrl: URL;
  let localUrl: URL;
  try {
    prodUrl = new URL(prodRaw);
  } catch {
    fail("PROD_DATABASE_URL is not a valid URL.");
  }
  try {
    localUrl = new URL(localRaw);
  } catch {
    fail("DATABASE_URL is not a valid URL.");
  }

  assertLocalTarget(localUrl);

  const pgBin = resolvePgBin();
  const exe = (name: string) =>
    path.join(pgBin, process.platform === "win32" ? `${name}.exe` : name);

  const targetDb = decodeURIComponent(localUrl.pathname.replace(/^\//, ""));
  if (!targetDb) fail("DATABASE_URL has no database name.");

  console.log(`  client : ${pgBin}`);
  console.log(`  source : ${prodUrl.hostname} (read-only)`);
  console.log(`  target : ${localUrl.hostname}:${localUrl.port || 5432}/${targetDb}`);
  console.log("");

  // Create the target database when absent, so a first run on a fresh cluster
  // needs no manual createdb.
  const adminUrl = new URL(localUrl.toString());
  adminUrl.pathname = "/postgres";
  const exists = psqlQuery(
    pgBin,
    adminUrl,
    `SELECT 1 FROM pg_database WHERE datname = '${targetDb.replace(/'/g, "''")}'`,
  );
  if (exists === null) {
    fail(
      `Could not reach the local PostgreSQL server at ${localUrl.hostname}:${localUrl.port}.\n` +
        `  The project cluster is not a Windows service — start it with:\n` +
        `    "${exe("pg_ctl")}" -D C:/Users/levio/pgdata-sringeri -o "-p 5544" start`,
    );
  }
  if (exists !== "1") {
    console.log(`→ creating database ${targetDb}`);
    run(exe("psql"), ["-X", "-w", "-d", adminUrl.toString(), "-c", `CREATE DATABASE "${targetDb}"`], "createdb");
  }

  if (reuseDump) {
    if (!existsSync(DUMP_FILE)) fail(`--reuse-dump given but ${DUMP_FILE} does not exist.`);
    console.log(`→ reusing existing dump (${(statSync(DUMP_FILE).size / 1024 / 1024).toFixed(0)} MB)`);
  } else {
    mkdirSync(DUMP_DIR, { recursive: true });
    console.log("→ dumping production (read-only, this moves a lot of data)…");
    // Options BEFORE -d: PostgreSQL's Windows getopt stops at the first
    // non-option argument, so a bare connection string first would swallow them.
    run(
      exe("pg_dump"),
      [
        "--schema=public",
        "--no-owner",
        "--no-privileges",
        "--no-comments",
        "-Fc",
        "-f",
        DUMP_FILE,
        "-d",
        prodUrl.toString(),
      ],
      "pg_dump",
    );
    console.log(`  dump written: ${(statSync(DUMP_FILE).size / 1024 / 1024).toFixed(0)} MB`);
  }

  console.log(`→ restoring into ${targetDb}…`);
  // --clean --if-exists so repeat runs replace cleanly instead of colliding on
  // objects that already exist.
  run(
    exe("pg_restore"),
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
