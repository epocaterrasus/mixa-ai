// @mixa-ai/db — Drizzle ORM schema and client

// Schema exports
export {
  users,
  items,
  chunks,
  tags,
  itemTags,
  projects,
  itemProjects,
  highlights,
  conversations,
  messages,
} from "./schema/index.js";

// All schema as a namespace for Drizzle client initialization
export * as schema from "./schema/index.js";

// Client exports
export { createDbClient, createPgliteClient } from "./client.js";
export type { DbClient, PgliteDbClient } from "./client.js";
