import { z } from "zod";
import { eq } from "drizzle-orm";
import { projects } from "@mixa-ai/db";
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
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(projects)
        .values({
          userId: ctx.userId,
          name: input.name,
          description: input.description ?? null,
          icon: input.icon ?? null,
          color: input.color ?? null,
        })
        .returning();

      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create project" });

      return {
        id: created.id,
        name: created.name,
        description: created.description,
        icon: created.icon,
        color: created.color,
      };
    }),

  list: publicProcedure
    .input(
      z
        .object({
          includeItemCounts: z.boolean().default(false),
        })
        .default({}),
    )
    .query(async ({ ctx }): Promise<{ projects: ProjectListItem[] }> => {
      const rows = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.userId, ctx.userId))
        .orderBy(projects.name);

      return {
        projects: rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          icon: r.icon,
          color: r.color,
        })),
      };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id))
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Project not found: ${input.id}` });
      }

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        color: row.color,
        isDefault: row.isDefault,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
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
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const setValues: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.name !== undefined) setValues["name"] = updates.name;
      if (updates.description !== undefined) setValues["description"] = updates.description;
      if (updates.icon !== undefined) setValues["icon"] = updates.icon;
      if (updates.color !== undefined) setValues["color"] = updates.color;

      const [updated] = await ctx.db
        .update(projects)
        .set(setValues)
        .where(eq(projects.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Project not found: ${id}` });
      }

      return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        icon: updated.icon,
        color: updated.color,
      };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(projects)
        .where(eq(projects.id, input.id))
        .returning({ id: projects.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Project not found: ${input.id}` });
      }
      return { success: true };
    }),
});
