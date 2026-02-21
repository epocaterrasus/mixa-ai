import { z } from "zod";
import { router, publicProcedure, TRPCError } from "../trpc.js";

export const tagsRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .default({}),
    )
    .query(async ({ input: _input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      return { tags: [] };
    }),

  merge: publicProcedure
    .input(
      z.object({
        sourceTagIds: z.array(z.string().uuid()).min(1),
        targetTagId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: `tags.merge not yet connected to database: ${input.sourceTagIds.join(", ")} -> ${input.targetTagId}`,
      });
    }),

  rename: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(50),
      }),
    )
    .mutation(async ({ input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Tag not found: ${input.id}`,
      });
    }),
});
