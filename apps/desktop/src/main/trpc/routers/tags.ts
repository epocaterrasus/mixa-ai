import { z } from "zod";
import { eq, ilike } from "drizzle-orm";
import { tags, itemTags } from "@mixa-ai/db";
import { router, publicProcedure, TRPCError } from "../trpc.js";

export interface TagListItem {
  id: string;
  name: string;
  color: string | null;
}

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
    .query(async ({ ctx, input }): Promise<{ tags: TagListItem[] }> => {
      let query = ctx.db
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(tags)
        .orderBy(tags.name)
        .limit(input.limit);

      if (input.search) {
        query = ctx.db
          .select({ id: tags.id, name: tags.name, color: tags.color })
          .from(tags)
          .where(ilike(tags.name, `%${input.search}%`))
          .orderBy(tags.name)
          .limit(input.limit);
      }

      const rows = await query;
      return { tags: rows };
    }),

  merge: publicProcedure
    .input(
      z.object({
        sourceTagIds: z.array(z.string().uuid()).min(1),
        targetTagId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [target] = await ctx.db
        .select()
        .from(tags)
        .where(eq(tags.id, input.targetTagId))
        .limit(1);

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Target tag not found: ${input.targetTagId}` });
      }

      for (const sourceId of input.sourceTagIds) {
        if (sourceId === input.targetTagId) continue;

        // Move item_tags from source to target (ignoring conflicts)
        const sourceLinks = await ctx.db
          .select()
          .from(itemTags)
          .where(eq(itemTags.tagId, sourceId));

        for (const link of sourceLinks) {
          const [existing] = await ctx.db
            .select({ itemId: itemTags.itemId })
            .from(itemTags)
            .where(eq(itemTags.itemId, link.itemId))
            .limit(1);

          if (!existing) {
            await ctx.db
              .insert(itemTags)
              .values({
                itemId: link.itemId,
                tagId: input.targetTagId,
                score: link.score,
              });
          }
        }

        // Delete source tag (cascades item_tags)
        await ctx.db.delete(tags).where(eq(tags.id, sourceId));
      }

      return { success: true, targetTag: target };
    }),

  rename: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tags)
        .set({ name: input.name })
        .where(eq(tags.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Tag not found: ${input.id}` });
      }

      return { id: updated.id, name: updated.name, color: updated.color };
    }),
});
