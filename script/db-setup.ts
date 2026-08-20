import "../server/load-env";
import { existsSync, mkdirSync, readdirSync } from "fs";
import path from "path";
import {
  adminUrlFor,
  databaseNameOf,
  exe,
  fail,
  psqlQuery,
  requireLocalDatabaseUrl,
  resolveDataDir,
  resolvePgBin,
  run,
  runQuiet,
} from "./pg-util";

/**
 * Creates and starts this project's own PostgreSQL cluster, then creates the
 * application database inside it.
 *
 * The cluster is deliberately separate from any system-wide PostgreSQL service:
 * it is loopback-only, uses `trust` auth so no password is needed, and holds
 * nothing but a disposable copy of production.
 *
 * Idempotent on purpose. It is safe — and expected — to re-run: it skips
 * `initdb` when a cluster is already present, skips the start when the server is
 * already listening, and skips the CREATE when the database exists. Because the
 * cluster is not a system service, re-running this is also how you start it
 * again after a reboot.
 */

const READY_TIMEOUT_MS = 20_000;
const READY_POLL_MS = 500;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: npm run db:setup

  Creates the local PostgreSQL cluster if absent, starts it if not running, and
  creates the application database. Safe to re-run; also the way to start the
  cluster after a reboot.

  PGDATA_DIR   Cluster data directory (default: <home>/pgdata-sringeri)
  PG_BIN       PostgreSQL client directory
`);
  process.exit(0);
}

const unknown = args.filter((a) => !["--help", "-h"].includes(a));
if (unknown.length) {
  console.error(`Unknown option(s): ${unknown.join(", ")}\nTry: npm run db:setup -- --help`);
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const url = requireLocalDatabaseUrl();
  const pgBin = resolvePgBin();
  const dataDir = resolveDataDir();

  // The URL is the single source of truth for port, role and database name, so
  // changing .env is enough to move the cluster.
  const port = url.port || "5432";
  const role = decodeURIComponent(url.username) || "postgres";
  const dbName = databaseNameOf(url);
  const adminUrl = adminUrlFor(url);
  const logFile = path.join(dataDir, "server.log");

  console.log(`  client   : ${pgBin}`);
  console.log(`  data dir : ${dataDir}`);
  console.log(`  port     : ${port}`);
  console.log(`  database : ${dbName} (role ${role})`);
  console.log("");

  // A PG_VERSION file is PostgreSQL's own marker for "this directory is a
  // cluster". Checking it is what makes re-running safe: we must never initdb
  // over an existing cluster, which would be catastrophic data loss.
  const isExistingCluster = existsSync(path.join(dataDir, "PG_VERSION"));

  if (isExistingCluster) {
    console.log("✓ cluster already exists — leaving it untouched");
  } else {
    if (existsSync(dataDir)) {
      const entries = readdirSync(dataDir);
      if (entries.length > 0) {
        fail(
          `${dataDir} exists, is not empty, and is not a PostgreSQL cluster.\n` +
            `  Refusing to initdb into it. Move it aside or set PGDATA_DIR elsewhere.`,
        );
      }
    }
    mkdirSync(dataDir, { recursive: true });
    console.log("→ creating cluster (trust auth: loopback-only, no password)…");
    run(
      exe(pgBin, "initdb"),
      ["-D", dataDir, "-U", role, "--auth=trust", "--auth-local=trust", "--auth-host=trust", "-E", "UTF8"],
      "initdb",
    );
  }

  // Already listening? Then there is nothing to start.
  const alreadyUp = psqlQuery(pgBin, adminUrl, "SELECT 1") === "1";
  if (alreadyUp) {
    console.log("✓ server already running");
  } else {
    console.log(`→ starting server on port ${port}…`);
    runQuiet(exe(pgBin, "pg_ctl"), ["-D", dataDir, "-o", `-p ${port}`, "-l", logFile, "start"], "pg_ctl start");

    const deadline = Date.now() + READY_TIMEOUT_MS;
    let ready = false;
    while (Date.now() < deadline) {
      if (psqlQuery(pgBin, adminUrl, "SELECT 1") === "1") {
        ready = true;
        break;
      }
      await sleep(READY_POLL_MS);
    }
    if (!ready) {
      fail(
        `Server did not accept connections within ${READY_TIMEOUT_MS / 1000}s.\n` +
          `  Check the log: ${logFile}`,
      );
    }
    console.log("✓ server ready");
  }

  const dbExists =
    psqlQuery(pgBin, adminUrl, `SELECT 1 FROM pg_database WHERE datname = '${dbName.replace(/'/g, "''")}'`) === "1";
  if (dbExists) {
    console.log(`✓ database ${dbName} already exists — not modified`);
  } else {
    console.log(`→ creating database ${dbName}…`);
    run(exe(pgBin, "psql"), ["-X", "-w", "-d", adminUrl.toString(), "-c", `CREATE DATABASE "${dbName}"`], "createdb");
  }

  const tables = psqlQuery(
    pgBin,
    url,
    `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`,
  );
  console.log(`\n✓ ready — ${dbName} has ${tables ?? "?"} tables`);
  console.log(
    tables === "0"
      ? "  Next: npm run db:refresh   (loads a copy of production)\n"
      : "  Next: npm run dev\n",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
