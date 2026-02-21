import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { items } from "./items.js";
import { projects } from "./projects.js";

export const itemProjects = pgTable(
  "item_projects",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.projectId] }),
    index("item_projects_project_id_idx").on(table.projectId),
  ],
);
