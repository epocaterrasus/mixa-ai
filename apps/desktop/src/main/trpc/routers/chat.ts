import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { conversations, messages } from "@mixa-ai/db";
import { router, publicProcedure, TRPCError } from "../trpc.js";

const chatScopeSchema = z.object({
  projectIds: z.array(z.string().uuid()).default([]),
  tagIds: z.array(z.string().uuid()).default([]),
  itemIds: z.array(z.string().uuid()).default([]),
});

export const chatRouter = router({
  createConversation: publicProcedure
    .input(
      z.object({
        title: z.string().nullish(),
        scope: chatScopeSchema.nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(conversations)
        .values({
          userId: ctx.userId,
          title: input.title ?? null,
          scope: (input.scope ?? null) as { projectIds: string[]; tagIds: string[]; itemIds: string[] } | null,
        })
        .returning();

      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create conversation" });

      return {
        id: created.id,
        title: created.title,
        scope: created.scope,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    }),

  sendMessage: publicProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [conversation] = await ctx.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Conversation not found: ${input.conversationId}`,
        });
      }

      const [userMessage] = await ctx.db
        .insert(messages)
        .values({
          conversationId: input.conversationId,
          role: "user",
          content: input.content,
        })
        .returning();

      if (!userMessage) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to store message" });

      await ctx.db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, input.conversationId));

      return { messageId: userMessage.id };
    }),

  listConversations: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).default(20),
          offset: z.number().int().min(0).default(0),
        })
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, ctx.userId))
        .orderBy(desc(conversations.updatedAt))
        .limit(input.limit)
        .offset(input.offset);

      const allIds = await ctx.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.userId, ctx.userId));

      return {
        conversations: rows.map((r) => ({
          id: r.id,
          title: r.title,
          scope: r.scope,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
        total: allIds.length,
      };
    }),

  getConversation: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [conversation] = await ctx.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.id))
        .limit(1);

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Conversation not found: ${input.id}`,
        });
      }

      const msgs = await ctx.db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, input.id))
        .orderBy(messages.createdAt);

      return {
        id: conversation.id,
        title: conversation.title,
        scope: conversation.scope,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messages: msgs.map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          role: m.role,
          content: m.content,
          citations: m.citations,
          modelUsed: m.modelUsed,
          tokenCount: m.tokenCount,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    }),

  deleteConversation: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(conversations)
        .where(eq(conversations.id, input.id))
        .returning({ id: conversations.id });

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Conversation not found: ${input.id}`,
        });
      }
      return { success: true };
    }),
});
