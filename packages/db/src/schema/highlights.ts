import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { items } from "./items.js";

export const highlights = pgTable(
  "highlights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    note: text("note"),
    color: text("color"),
    selectorData: jsonb("selector_data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("highlights_item_id_idx").on(table.itemId)],
);
