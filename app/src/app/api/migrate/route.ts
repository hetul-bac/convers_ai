import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { Client } from "pg";

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
      "Missing a direct Postgres connection string. Set SUPABASE_DB_URL, SUPABASE_DIRECT_URL, DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL_NON_POOLING.",
    );
  }

  return databaseUrl;
}

export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = request.headers.get("x-admin-secret");

  if (!adminSecret || providedSecret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
    }

    const rootDir = path.join(process.cwd(), "..");
    const [schemaSql, seedSql] = await Promise.all([
      readFile(path.join(rootDir, "schema.sql"), "utf8"),
      readFile(path.join(rootDir, "seed.sql"), "utf8"),
    ]);
    const client = new Client({
      connectionString: getDatabaseUrl(),
    });

    await client.connect();

    try {
      await client.query(schemaSql);
      await client.query(seedSql);
    } finally {
      await client.end().catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      message: "Schema and seed applied",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 },
    );
  }
}
