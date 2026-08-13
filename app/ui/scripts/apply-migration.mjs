// Applies a SQL migration file to the live Supabase database over a direct
// Postgres connection.
//
// Usage:
//   node scripts/apply-migration.mjs <migration.sql> <postgres://connection-string>
//
// Connection string can also be provided via DATABASE_URL. Prefer the
// transaction-pooler URL (port 6543) so the migration runs in a real
// transaction instead of autocommit.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const [, , migrationArg, urlArg] = process.argv;
const migrationPath = migrationArg
  ? join(process.cwd(), migrationArg)
  : join(ROOT, "supabase", "migrations", "20260815000000_create_oriel_discovery_candidates.sql");
const connectionString = urlArg ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing connection string. Pass it as argv[2] or set DATABASE_URL.");
  process.exit(1);
}

const sql = readFileSync(migrationPath, "utf8");
const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`Applying ${migrationPath}`);
  await client.query(sql);
  const { rows } = await client.query(
    "select exists(select 1 from pg_proc where proname = 'oriel_discovery_candidates') as rpc_exists"
  );
  console.log("rpc_exists:", rows[0].rpc_exists);
} finally {
  await client.end();
}
