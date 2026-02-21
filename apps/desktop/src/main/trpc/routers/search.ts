import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";

const itemTypeSchema = z.enum([
  "article",
  "highlight",
  "youtube",
  "pdf",
  "code",
  "image",
  "terminal",
]);

export const searchRouter = router({
  hybrid: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(50).default(10),
        filters: z
          .object({
            itemTypes: z.array(itemTypeSchema).optional(),
            tagIds: z.array(z.string().uuid()).optional(),
            projectIds: z.array(z.string().uuid()).optional(),
            dateFrom: z.string().datetime().optional(),
            dateTo: z.string().datetime().optional(),
            isFavorite: z.boolean().optional(),
          })
          .default({}),
        vectorWeight: z.number().min(0).max(1).default(0.6),
        ftsWeight: z.number().min(0).max(1).default(0.4),
        minScore: z.number().min(0).max(1).default(0.1),
      }),
    )
    .query(async ({ input: _input }) => {
      // TODO: Implement with hybrid search (MIXA-016)
      return {
        results: [] as Array<{
          itemId: string;
          title: string;
          snippet: string;
          score: number;
          itemType: string;
        }>,
        total: 0,
      };
    }),
});
