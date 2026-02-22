import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import postgres from "postgres";
import * as schema from "./schema/index.js";

function getConnectionString(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is required. " +
        "Set it to a PostgreSQL connection string, e.g. " +
        "postgres://mixa:mixa@localhost:5432/mixa",
    );
  }
  return url;
}

/**
 * Create a database client backed by an external PostgreSQL instance.
 * Used by drizzle-kit CLI and optional Docker workflow.
 */
export function createDbClient(connectionString?: string) {
  const url = connectionString ?? getConnectionString();
  const sql = postgres(url);
  const db = drizzlePg(sql, { schema });
  return { db, sql };
}

/**
 * Create an embedded PGlite database client with pgvector extension.
 * Pass a filesystem path for persistent storage, or omit for in-memory.
 */
export async function createPgliteClient(dataDir?: string) {
  const client = new PGlite({
    dataDir,
    extensions: { vector },
  });
  await client.waitReady;
  const db = drizzlePglite({ client, schema });
  return { db, client };
}

export type PgliteDbClient = Awaited<ReturnType<typeof createPgliteClient>>["db"];
export type DbClient = PgliteDbClient;
