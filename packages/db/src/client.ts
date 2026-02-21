import { drizzle } from "drizzle-orm/postgres-js";
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
 * Create a database client. Call this once at app startup.
 * The returned object includes the Drizzle client and a close function.
 */
export function createDbClient(connectionString?: string) {
  const url = connectionString ?? getConnectionString();
  const sql = postgres(url);
  const db = drizzle(sql, { schema });
  return { db, sql };
}

export type DbClient = ReturnType<typeof createDbClient>["db"];
