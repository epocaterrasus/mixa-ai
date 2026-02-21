import { z } from "zod";
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
    .mutation(async ({ input }) => {
      // TODO: Implement with PGlite (MIXA-046) + RAG pipeline (MIXA-017)
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: `chat.createConversation not yet connected: ${input.title ?? "untitled"}`,
      });
    }),

  sendMessage: publicProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      // TODO: Implement with RAG pipeline (MIXA-017)
      // This will eventually support streaming via tRPC subscriptions
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: `chat.sendMessage not yet connected: conversation ${input.conversationId}`,
      });
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
    .query(async ({ input: _input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      return { conversations: [], total: 0 };
    }),

  getConversation: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Conversation not found: ${input.id}`,
      });
    }),

  deleteConversation: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // TODO: Implement with PGlite (MIXA-046)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Conversation not found: ${input.id}`,
      });
    }),
});
