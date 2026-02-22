import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";
import { createPgliteClient, type PgliteDbClient } from "@mixa-ai/db";
import { users } from "@mixa-ai/db";
import { eq } from "drizzle-orm";
import { SCHEMA_DDL } from "./schema-ddl.js";

const MIXA_DATA_DIR = join(homedir(), ".mixa", "data", "pglite");
const LOCAL_USER_EMAIL = "local@mixa.app";

let _db: PgliteDbClient | null = null;
let _userId: string | null = null;
let _pgliteClient: Awaited<ReturnType<typeof createPgliteClient>>["client"] | null = null;

function ensureDataDir(): void {
  mkdirSync(MIXA_DATA_DIR, { recursive: true });
}

/**
 * Initialize the embedded PGlite database.
 * Creates the data directory, applies schema, and ensures a default user exists.
 * Must be called once at app startup before any DB access.
 */
export async function initDatabase(): Promise<void> {
  ensureDataDir();

  const { db, client } = await createPgliteClient(MIXA_DATA_DIR);
  _db = db;
  _pgliteClient = client;

  await client.exec(SCHEMA_DDL);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, LOCAL_USER_EMAIL))
    .limit(1);

  if (existing.length > 0 && existing[0]) {
    _userId = existing[0].id;
  } else {
    const [created] = await db
      .insert(users)
      .values({
        email: LOCAL_USER_EMAIL,
        displayName: "Mixa User",
      })
      .returning({ id: users.id });
    if (!created) throw new Error("Failed to create default user");
    _userId = created.id;
  }
}

/** Get the Drizzle DB client. Throws if initDatabase() has not been called. */
export function getDb(): PgliteDbClient {
  if (!_db) throw new Error("Database not initialized — call initDatabase() first");
  return _db;
}

/** Get the default local user ID. Throws if initDatabase() has not been called. */
export function getUserId(): string {
  if (!_userId) throw new Error("Database not initialized — call initDatabase() first");
  return _userId;
}

/** Gracefully close the PGlite instance. Call on app shutdown. */
export async function closeDatabase(): Promise<void> {
  if (_pgliteClient) {
    await _pgliteClient.close();
    _pgliteClient = null;
  }
  _db = null;
  _userId = null;
}
