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

// Client exports
export { createDbClient } from "./client.js";
export type { DbClient } from "./client.js";
