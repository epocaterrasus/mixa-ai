import { z } from "zod";
import { router, publicProcedure, TRPCError } from "../trpc.js";
import * as chatStore from "../../chat/store.js";

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
    .mutation(({ input }) => {
      const conversation = chatStore.createConversation(
        input.title ?? null,
        input.scope ?? null,
      );
      return conversation;
    }),

  sendMessage: publicProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().min(1),
      }),
    )
    .mutation(({ input }) => {
      const conversation = chatStore.getConversation(input.conversationId);
      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Conversation not found: ${input.conversationId}`,
        });
      }

      // Store user message (assistant response is handled via IPC streaming)
      const userMessage = chatStore.addMessage(
        input.conversationId,
        "user",
        input.content,
      );

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
    .query(({ input }) => {
      return chatStore.listConversations(input.limit, input.offset);
    }),

  getConversation: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      const conversation = chatStore.getConversation(input.id);
      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Conversation not found: ${input.id}`,
        });
      }
      const messages = chatStore.getMessages(input.id);
      return { ...conversation, messages };
    }),

  deleteConversation: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      const deleted = chatStore.deleteConversation(input.id);
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Conversation not found: ${input.id}`,
        });
      }
      return { success: true };
    }),
});
