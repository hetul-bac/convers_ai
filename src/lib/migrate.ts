import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const migrationFiles = [
  {
    name: "schema",
    filePath: path.join(process.cwd(), "schema.sql"),
  },
  {
    name: "seed",
    filePath: path.join(process.cwd(), "seed.sql"),
  },
];

function getDatabaseUrl() {
  const databaseUrl =
    process.env.SUPABASE_DB_URL ??
    process.env.SUPABASE_DIRECT_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING;

  if (!databaseUrl) {
    throw new Error(
      "Missing a direct Postgres connection string. Set one of SUPABASE_DB_URL, SUPABASE_DIRECT_URL, DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL_NON_POOLING.",
    );
  }

  return databaseUrl;
}

async function executeSqlFile(filePath: string) {
  const databaseUrl = getDatabaseUrl();
  const sql = await readFile(filePath, "utf8");
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    await client.query(sql);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Postgres error";

    throw new Error(
      `Failed while applying ${path.basename(filePath)}.\n${message}`,
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function runMigrations() {
  for (const migration of migrationFiles) {
    try {
      await executeSqlFile(migration.filePath);
      console.log(`Migration ${migration.name} applied successfully.`);
    } catch (error) {
      console.error(`Migration ${migration.name} failed.`, error);
      throw error;
    }
  }
}
