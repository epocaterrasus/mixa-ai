import { index, pgTable, primaryKey, real, uuid } from "drizzle-orm/pg-core";
import { items } from "./items.js";
import { tags } from "./tags.js";

export const itemTags = pgTable(
  "item_tags",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    score: real("score").default(1.0).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.tagId] }),
    index("item_tags_tag_id_idx").on(table.tagId),
  ],
);
