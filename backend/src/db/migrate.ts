import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { env } from "../config/env";

async function resolveSchemaPath(): Promise<string> {
  const candidates = [
    path.resolve(__dirname, "schema.sql"),
    path.resolve(__dirname, "../db/schema.sql"),
    path.resolve(process.cwd(), "src/db/schema.sql"),
    path.resolve(process.cwd(), "dist/db/schema.sql")
  ];

  for (const candidate of candidates) {
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch {
      // Keep trying until we find a readable path.
    }
  }

  throw new Error("Could not locate schema.sql");
}

async function runMigration(): Promise<void> {
  const schemaPath = await resolveSchemaPath();
  const schemaSql = await readFile(schemaPath, "utf8");
  const pool = new Pool({ connectionString: env.DATABASE_URL });

  try {
    await pool.query(schemaSql);
    console.log(`Schema migration applied from ${schemaPath}`);
  } finally {
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error("Migration failed", error);
  process.exit(1);
});
