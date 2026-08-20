import { spawnSync } from "child_process";
import { existsSync } from "fs";
import os from "os";
import path from "path";

/**
 * Shared PostgreSQL helpers for the db:setup and db:refresh scripts.
 *
 * Both scripts drive the same local cluster, so the connection rules, binary
 * discovery and the loopback safety gate live here rather than being duplicated
 * and drifting apart.
 */

/**
 * Prod is PostgreSQL 16.14, so the version-matched client is what avoids
 * dump/restore skew. Other majors may also be installed (PG 18 on this machine,
 * port 5433) and are deliberately not preferred.
 */
const PG_BIN_CANDIDATES = [
  process.env.PG_BIN,
  "C:/Program Files/PostgreSQL/16/bin",
  "/usr/lib/postgresql/16/bin",
  "/usr/local/opt/postgresql@16/bin",
].filter((p): p is string => !!p);

const EXE_SUFFIX = process.platform === "win32" ? ".exe" : "";

export function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

export function resolvePgBin(): string {
  for (const dir of PG_BIN_CANDIDATES) {
    if (existsSync(path.join(dir, `pg_dump${EXE_SUFFIX}`))) return dir;
  }
  fail(
    `Could not find the PostgreSQL 16 client.\n` +
      `  Looked in:\n${PG_BIN_CANDIDATES.map((d) => `    ${d}`).join("\n")}\n` +
      `  Install PostgreSQL 16, or set PG_BIN to the directory containing pg_dump.`,
  );
}

export function exe(pgBin: string, name: string): string {
  return path.join(pgBin, `${name}${EXE_SUFFIX}`);
}

/**
 * Where the project's own cluster lives. Overridable, and defaulting under the
 * *current* user's home — never a path baked in from whoever wrote this.
 */
export function resolveDataDir(): string {
  return process.env.PGDATA_DIR || path.join(os.homedir(), "pgdata-sringeri");
}

/**
 * The safety gate. Both scripts perform destructive work on the target
 * (db:refresh restores over it, db:setup can create it), so anything other than
 * a loopback address is refused rather than acted on.
 */
export function assertLocalTarget(url: URL): void {
  const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];
  if (!LOCAL_HOSTS.includes(url.hostname)) {
    fail(
      `Refusing to run: DATABASE_URL points at "${url.hostname}", not a local host.\n` +
        `  These scripts create and replace databases.\n` +
        `  DATABASE_URL must name your local copy (see "The local database" in CLAUDE.md).`,
    );
  }
}

/** Reads DATABASE_URL and returns it parsed, after the loopback check. */
export function requireLocalDatabaseUrl(): URL {
  const raw = process.env.DATABASE_URL;
  if (!raw) fail("DATABASE_URL is not set. It must name your local database (see .env.example).");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    fail("DATABASE_URL is not a valid URL.");
  }
  assertLocalTarget(url);
  return url;
}

export function run(exePath: string, argv: string[], label: string): void {
  const result = spawnSync(exePath, argv, { stdio: ["ignore", "inherit", "inherit"] });
  if (result.error) fail(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} exited with code ${result.status}`);
}

/**
 * Like `run`, but with every stdio handle closed.
 *
 * Required for `pg_ctl start`: the postgres server it spawns inherits whatever
 * stdout/stderr it is given and holds them for its entire lifetime. With
 * inherited handles the pipe never closes, so the caller blocks forever even
 * though the server started fine. The server logs to its `-l` file regardless,
 * so nothing is lost by discarding them.
 */
export function runQuiet(exePath: string, argv: string[], label: string): void {
  const result = spawnSync(exePath, argv, { stdio: "ignore" });
  if (result.error) fail(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} exited with code ${result.status}`);
}

/** Runs psql and returns trimmed stdout, or null when the command fails. */
export function psqlQuery(pgBin: string, url: URL, sql: string): string | null {
  const result = spawnSync(exe(pgBin, "psql"), ["-X", "-w", "-At", "-d", url.toString(), "-c", sql], {
    encoding: "utf8",
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

/** The database name carried by a connection URL. */
export function databaseNameOf(url: URL): string {
  const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!name) fail("DATABASE_URL has no database name.");
  return name;
}

/** Same connection, but pointed at the always-present `postgres` database. */
export function adminUrlFor(url: URL): URL {
  const admin = new URL(url.toString());
  admin.pathname = "/postgres";
  return admin;
}
