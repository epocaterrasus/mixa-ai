import { randomUUID } from "node:crypto";
import { z } from "zod";
import { router, publicProcedure, TRPCError } from "../trpc.js";
import { captureStore, type CapturedItem } from "../../capture/service.js";

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

function toItemResponse(item: CapturedItem): ItemResponse {
  return {
    id: item.id,
    url: item.url,
    title: item.title,
    description: item.description,
    contentText: item.contentText,
    contentHtml: item.contentHtml,
    itemType: item.itemType,
    sourceType: item.sourceType,
    thumbnailUrl: item.thumbnailUrl,
    faviconUrl: item.faviconUrl,
    domain: item.domain,
    wordCount: item.wordCount,
    readingTime: item.readingTime,
    summary: item.description,
    isArchived: item.isArchived,
    isFavorite: item.isFavorite,
    tags: [],
    projectId: null,
    capturedAt: item.capturedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
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
    .mutation(async ({ input }) => {
      const now = new Date().toISOString();
      const item: CapturedItem = {
        id: randomUUID(),
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
        wordCount: input.contentText
          ? input.contentText.split(/\s+/).filter((w) => w.length > 0).length
          : null,
        readingTime: null,
        isArchived: false,
        isFavorite: false,
        capturedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      captureStore.add(item);
      return toItemResponse(item);
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
    .query(async ({ input }) => {
      let items = captureStore.getAll();

      // Filter
      if (input.itemType) {
        items = items.filter((i) => i.itemType === input.itemType);
      }
      if (input.isFavorite !== undefined) {
        items = items.filter((i) => i.isFavorite === input.isFavorite);
      }
      if (input.isArchived !== undefined) {
        items = items.filter((i) => i.isArchived === input.isArchived);
      }
      if (input.dateFrom) {
        items = items.filter((i) => i.capturedAt >= input.dateFrom!);
      }
      if (input.dateTo) {
        items = items.filter((i) => i.capturedAt <= input.dateTo!);
      }

      // Sort
      const sortDir = input.sortOrder === "asc" ? 1 : -1;
      items.sort((a, b) => {
        const aVal = a[input.sortBy] ?? "";
        const bVal = b[input.sortBy] ?? "";
        return aVal < bVal ? -sortDir : aVal > bVal ? sortDir : 0;
      });

      const total = items.length;
      const sliced = items.slice(input.offset, input.offset + input.limit);

      return {
        items: sliced.map(toItemResponse),
        total,
      };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const item = captureStore.getById(input.id);
      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Item not found: ${input.id}`,
        });
      }
      return toItemResponse(item);
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
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const updated = captureStore.update(id, updates);
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Item not found: ${id}`,
        });
      }
      return toItemResponse(updated);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const deleted = captureStore.delete(input.id);
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Item not found: ${input.id}`,
        });
      }
      return { success: true };
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(50).default(10),
        itemType: itemTypeSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      const query = input.query.toLowerCase();
      let items = captureStore.getAll().filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(query);
        const contentMatch = item.contentText?.toLowerCase().includes(query) ?? false;
        const domainMatch = item.domain?.toLowerCase().includes(query) ?? false;
        return titleMatch || contentMatch || domainMatch;
      });

      if (input.itemType) {
        items = items.filter((i) => i.itemType === input.itemType);
      }

      return {
        items: items.slice(0, input.limit).map(toItemResponse),
        total: items.length,
      };
    }),
});
