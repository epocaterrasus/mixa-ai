import { z } from "zod";
import { router, publicProcedure, TRPCError } from "../trpc.js";

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

export const projectsRouter = router({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().nullish(),
        icon: z.string().nullish(),
        color: z.string().nullish(),
      }),
    )
    .mutation(async ({ input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: `projects.create not yet connected to database: ${input.name}`,
      });
    }),

  list: publicProcedure
    .input(
      z
        .object({
          includeItemCounts: z.boolean().default(false),
        })
        .default({}),
    )
    .query(async ({ input: _input }): Promise<{ projects: ProjectListItem[] }> => {
      // TODO: Implement with PGlite (MIXA-046)
      return { projects: [] };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Project not found: ${input.id}`,
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().nullish(),
        icon: z.string().nullish(),
        color: z.string().nullish(),
      }),
    )
    .mutation(async ({ input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Project not found: ${input.id}`,
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Project not found: ${input.id}`,
      });
    }),
});
