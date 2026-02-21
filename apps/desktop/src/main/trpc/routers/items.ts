import { z } from "zod";
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
      // TODO: Implement with PGlite (MIXA-046)
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: `items.create not yet connected to database: ${input.title}`,
      });
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
        itemType: itemTypeSchema.optional(),
        isFavorite: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        sortBy: z
          .enum(["capturedAt", "title", "updatedAt"])
          .default("capturedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ input: _input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      return { items: [], total: 0 };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Item not found: ${input.id}`,
      });
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
      // TODO: Implement with PGlite (MIXA-046)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Item not found: ${input.id}`,
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Item not found: ${input.id}`,
      });
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(50).default(10),
        itemType: itemTypeSchema.optional(),
      }),
    )
    .query(async ({ input: _input }) => {
      // TODO: Implement with hybrid search (MIXA-016)
      return { items: [], total: 0 };
    }),
});
