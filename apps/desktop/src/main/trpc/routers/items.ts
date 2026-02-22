import { z } from "zod";
import { eq, and, gte, lte, desc, asc, sql, count } from "drizzle-orm";
import { items, tags, itemTags } from "@mixa-ai/db";
import { router, publicProcedure, TRPCError } from "../trpc.js";

const itemTypeSchema = z.enum([
  "article",
  "highlight",
  "youtube",
  "pdf",
  "code",
  "image",
  "terminal",
]);

const sourceTypeSchema = z.enum([
  "manual",
  "auto_capture",
  "extension",
  "terminal",
]);

export interface ItemTagResponse {
  id: string;
  name: string;
  color: string | null;
}

export interface ItemResponse {
  id: string;
  url: string | null;
  title: string;
  description: string | null;
  contentText: string | null;
  contentHtml: string | null;
  itemType: string;
  sourceType: string;
  thumbnailUrl: string | null;
  faviconUrl: string | null;
  domain: string | null;
  wordCount: number | null;
  readingTime: number | null;
  summary: string | null;
  isArchived: boolean;
  isFavorite: boolean;
  tags: ItemTagResponse[];
  projectId: string | null;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
}

type ItemRow = typeof items.$inferSelect;

async function getItemTags(
  db: Parameters<typeof publicProcedure.query>[0] extends never ? never : unknown,
  itemId: string,
): Promise<ItemTagResponse[]> {
  const dbTyped = db as ReturnType<typeof import("../trpc.js")["publicProcedure"]["query"]> extends never ? never : import("@mixa-ai/db").PgliteDbClient;
  const rows = await (dbTyped as import("@mixa-ai/db").PgliteDbClient)
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(itemTags)
    .innerJoin(tags, eq(itemTags.tagId, tags.id))
    .where(eq(itemTags.itemId, itemId));
  return rows;
}

function toItemResponse(row: ItemRow, itemTagList: ItemTagResponse[] = []): ItemResponse {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    contentText: row.contentText,
    contentHtml: row.contentHtml,
    itemType: row.itemType,
    sourceType: row.sourceType,
    thumbnailUrl: row.thumbnailUrl,
    faviconUrl: row.faviconUrl,
    domain: row.domain,
    wordCount: row.wordCount,
    readingTime: row.readingTime,
    summary: row.summary,
    isArchived: row.isArchived,
    isFavorite: row.isFavorite,
    tags: itemTagList,
    projectId: null,
    capturedAt: row.capturedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const itemsRouter = router({
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        url: z.string().url().nullish(),
        description: z.string().nullish(),
        contentText: z.string().nullish(),
        contentHtml: z.string().nullish(),
        itemType: itemTypeSchema,
        sourceType: sourceTypeSchema,
        thumbnailUrl: z.string().url().nullish(),
        faviconUrl: z.string().url().nullish(),
        domain: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const wordCount = input.contentText
        ? input.contentText.split(/\s+/).filter((w) => w.length > 0).length
        : null;

      const [created] = await ctx.db
        .insert(items)
        .values({
          userId: ctx.userId,
          url: input.url ?? null,
          title: input.title,
          description: input.description ?? null,
          contentText: input.contentText ?? null,
          contentHtml: input.contentHtml ?? null,
          itemType: input.itemType,
          sourceType: input.sourceType,
          thumbnailUrl: input.thumbnailUrl ?? null,
          faviconUrl: input.faviconUrl ?? null,
          domain: input.domain ?? null,
          wordCount,
          readingTime: null,
        })
        .returning();

      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create item" });
      return toItemResponse(created);
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
        itemType: itemTypeSchema.optional(),
        isFavorite: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        sortBy: z
          .enum(["capturedAt", "title", "updatedAt"])
          .default("capturedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(items.userId, ctx.userId)];

      if (input.itemType) {
        conditions.push(eq(items.itemType, input.itemType));
      }
      if (input.isFavorite !== undefined) {
        conditions.push(eq(items.isFavorite, input.isFavorite));
      }
      if (input.isArchived !== undefined) {
        conditions.push(eq(items.isArchived, input.isArchived));
      }
      if (input.dateFrom) {
        conditions.push(gte(items.capturedAt, new Date(input.dateFrom)));
      }
      if (input.dateTo) {
        conditions.push(lte(items.capturedAt, new Date(input.dateTo)));
      }

      const where = and(...conditions);
      const sortCol = input.sortBy === "title" ? items.title
        : input.sortBy === "updatedAt" ? items.updatedAt
        : items.capturedAt;
      const orderFn = input.sortOrder === "asc" ? asc : desc;

      const [rows, [totalRow]] = await Promise.all([
        ctx.db
          .select()
          .from(items)
          .where(where)
          .orderBy(orderFn(sortCol))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: count() })
          .from(items)
          .where(where),
      ]);

      return {
        items: rows.map((row) => toItemResponse(row)),
        total: totalRow?.count ?? 0,
      };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(items)
        .where(eq(items.id, input.id))
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Item not found: ${input.id}` });
      }

      const itemTagList = await ctx.db
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(itemTags)
        .innerJoin(tags, eq(itemTags.tagId, tags.id))
        .where(eq(itemTags.itemId, input.id));

      return toItemResponse(row, itemTagList);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        description: z.string().nullish(),
        isFavorite: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        summary: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const setValues: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.title !== undefined) setValues["title"] = updates.title;
      if (updates.description !== undefined) setValues["description"] = updates.description;
      if (updates.isFavorite !== undefined) setValues["isFavorite"] = updates.isFavorite;
      if (updates.isArchived !== undefined) setValues["isArchived"] = updates.isArchived;
      if (updates.summary !== undefined) setValues["summary"] = updates.summary;

      const [updated] = await ctx.db
        .update(items)
        .set(setValues)
        .where(eq(items.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Item not found: ${id}` });
      }
      return toItemResponse(updated);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(items)
        .where(eq(items.id, input.id))
        .returning({ id: items.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Item not found: ${input.id}` });
      }
      return { success: true };
    }),

  stats: publicProcedure
    .query(async ({ ctx }) => {
      const allItems = await ctx.db
        .select()
        .from(items)
        .where(eq(items.userId, ctx.userId));

      const total = allItems.length;

      let totalReadingTime = 0;
      let totalWordCount = 0;
      for (const item of allItems) {
        totalReadingTime += item.readingTime ?? 0;
        totalWordCount += item.wordCount ?? 0;
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dailyCounts: Record<string, number> = {};
      for (let d = 0; d < 30; d++) {
        const date = new Date(thirtyDaysAgo);
        date.setDate(date.getDate() + d);
        dailyCounts[date.toISOString().slice(0, 10)] = 0;
      }
      for (const item of allItems) {
        const day = item.capturedAt.toISOString().slice(0, 10);
        const current = dailyCounts[day];
        if (current !== undefined) {
          dailyCounts[day] = current + 1;
        }
      }
      const capturesPerDay = Object.entries(dailyCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, cnt]) => ({ date, count: cnt }));

      const domainCounts: Record<string, number> = {};
      for (const item of allItems) {
        if (item.domain) {
          domainCounts[item.domain] = (domainCounts[item.domain] ?? 0) + 1;
        }
      }
      const topDomains = Object.entries(domainCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([domain, cnt]) => ({ domain, count: cnt }));

      const typeCounts: Record<string, number> = {};
      for (const item of allItems) {
        typeCounts[item.itemType] = (typeCounts[item.itemType] ?? 0) + 1;
      }
      const typeBreakdown = Object.entries(typeCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([itemType, cnt]) => ({ itemType, count: cnt }));

      const favoritesCount = allItems.filter((i) => i.isFavorite).length;

      const recentCaptures = [...allItems]
        .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())
        .slice(0, 10)
        .map((item) => ({
          id: item.id,
          title: item.title,
          domain: item.domain,
          itemType: item.itemType,
          capturedAt: item.capturedAt.toISOString(),
          readingTime: item.readingTime,
          faviconUrl: item.faviconUrl,
        }));

      return {
        total,
        totalReadingTime,
        totalWordCount,
        favoritesCount,
        capturesPerDay,
        topDomains,
        typeBreakdown,
        recentCaptures,
      };
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(50).default(10),
        itemType: itemTypeSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query = input.query.toLowerCase();
      let allItems = await ctx.db
        .select()
        .from(items)
        .where(eq(items.userId, ctx.userId));

      allItems = allItems.filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(query);
        const contentMatch = item.contentText?.toLowerCase().includes(query) ?? false;
        const domainMatch = item.domain?.toLowerCase().includes(query) ?? false;
        return titleMatch || contentMatch || domainMatch;
      });

      if (input.itemType) {
        allItems = allItems.filter((i) => i.itemType === input.itemType);
      }

      return {
        items: allItems.slice(0, input.limit).map((row) => toItemResponse(row)),
        total: allItems.length,
      };
    }),
});
