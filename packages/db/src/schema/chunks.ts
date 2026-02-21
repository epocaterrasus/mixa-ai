import { customType } from "drizzle-orm/pg-core";
import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { items } from "./items.js";

const vector = customType<{ data: number[]; dpiverName: string; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  fromDriver(value) {
    if (typeof value === "string") {
      return value
        .slice(1, -1)
        .split(",")
        .map(Number);
    }
    return value as number[];
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
});

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chunks_item_id_idx").on(table.itemId),
    index("chunks_embedding_idx").using(
      "ivfflat",
      sql`${table.embedding} vector_cosine_ops`,
    ),
  ],
);
