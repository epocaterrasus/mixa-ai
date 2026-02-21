import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const items = pgTable(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url"),
    title: text("title").notNull(),
    description: text("description"),
    contentText: text("content_text"),
    contentHtml: text("content_html"),
    itemType: text("item_type").notNull(),
    sourceType: text("source_type").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    faviconUrl: text("favicon_url"),
    domain: text("domain"),
    wordCount: integer("word_count"),
    readingTime: integer("reading_time"),
    summary: text("summary"),
    isArchived: boolean("is_archived").default(false).notNull(),
    isFavorite: boolean("is_favorite").default(false).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("items_user_id_idx").on(table.userId),
    index("items_item_type_idx").on(table.itemType),
    index("items_domain_idx").on(table.domain),
    index("items_captured_at_idx").on(table.capturedAt),
    index("items_is_favorite_idx").on(table.isFavorite),
    index("items_fulltext_idx").using(
      "gin",
      sql`to_tsvector('english', coalesce(${table.title}, '') || ' ' || coalesce(${table.contentText}, ''))`,
    ),
  ],
);
