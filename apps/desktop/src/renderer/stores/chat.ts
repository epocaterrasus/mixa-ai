import { create } from "zustand";
import type { Citation, ChatScope } from "@mixa-ai/types";
import { trpc } from "../trpc";

// ── Types ─────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  isStreaming: boolean;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  title: string | null;
  scope: ChatScope | null;
  createdAt: string;
  updatedAt: string;
}

interface ChatStore {
  // State
  conversations: ChatConversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  showSidebar: boolean;
  scope: ChatScope;
  modelOverride: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  createConversation: () => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setScope: (scope: ChatScope) => void;
  setModelOverride: (model: string | null) => void;
  toggleSidebar: () => void;
  clearError: () => void;
  newConversation: () => void;

  // Streaming (called by IPC listener)
  handleStreamChunk: (
    messageId: string,
    content: string,
    done: boolean,
    citations: Citation[],
  ) => void;
}

const EMPTY_SCOPE: ChatScope = { projectIds: [], tagIds: [], itemIds: [] };

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  error: null,
  showSidebar: false,
  scope: EMPTY_SCOPE,
  modelOverride: null,

  loadConversations: async () => {
    try {
      const result = await trpc.chat.listConversations.query({ limit: 50, offset: 0 });
      set({ conversations: result.conversations as ChatConversation[] });
    } catch {
      // Silently handle — empty conversation list is fine
    }
  },

  createConversation: async () => {
    const { scope } = get();
    try {
      const conversation = await trpc.chat.createConversation.mutate({
        title: null,
        scope: scope.projectIds.length > 0 || scope.tagIds.length > 0 ? scope : null,
      }) as ChatConversation;

      set((state) => ({
        conversations: [conversation, ...state.conversations],
        activeConversationId: conversation.id,
        messages: [],
        error: null,
      }));

      return conversation.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create conversation";
      set({ error: message });
      throw err;
    }
  },

  selectConversation: async (id: string) => {
    try {
      const result = await trpc.chat.getConversation.query({ id }) as {
        id: string;
        title: string | null;
        scope: ChatScope | null;
        createdAt: string;
        updatedAt: string;
        messages: Array<{
          id: string;
          conversationId: string;
          role: "user" | "assistant";
          content: string;
          citations: Citation[];
          modelUsed: string | null;
          tokenCount: number | null;
          createdAt: string;
        }>;
      };

      const messages: ChatMessage[] = result.messages.map((m) => ({
        ...m,
        isStreaming: false,
      }));

      set({
        activeConversationId: id,
        messages,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load conversation";
      set({ error: message });
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await trpc.chat.deleteConversation.mutate({ id });
      const { activeConversationId } = get();
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        ...(activeConversationId === id
          ? { activeConversationId: null, messages: [] }
          : {}),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete conversation";
      set({ error: message });
    }
  },

  sendMessage: async (content: string) => {
    const { activeConversationId, isStreaming, modelOverride } = get();
    if (isStreaming) return;

    let conversationId = activeConversationId;

    if (!conversationId) {
      conversationId = await get().createConversation();
    }

    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content,
      citations: [],
      isStreaming: false,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
      error: null,
    }));

    try {
      const result = await window.electronAPI.chat.sendMessage(
        conversationId,
        content,
        modelOverride ?? undefined,
      );

      // Update user message with real ID
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === userMessage.id ? { ...m, id: result.userMessageId } : m,
        ),
      }));

      // Add placeholder for streaming assistant message
      const assistantMessage: ChatMessage = {
        id: result.assistantMessageId,
        role: "assistant",
        content: "",
        citations: [],
        isStreaming: true,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send message";
      set({ error: message, isStreaming: false });
    }
  },

  handleStreamChunk: (messageId, content, done, citations) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              content,
              citations: citations.length > 0 ? citations : m.citations,
              isStreaming: !done,
            }
          : m,
      ),
      isStreaming: !done,
    }));

    // Refresh conversation list when streaming completes (to update titles)
    if (done) {
      void get().loadConversations();
    }
  },

  setScope: (scope: ChatScope) => {
    set({ scope });
  },

  setModelOverride: (model: string | null) => {
    set({ modelOverride: model });
  },

  toggleSidebar: () => {
    set((state) => ({ showSidebar: !state.showSidebar }));
  },

  clearError: () => {
    set({ error: null });
  },

  newConversation: () => {
    set({
      activeConversationId: null,
      messages: [],
      error: null,
      isStreaming: false,
      modelOverride: null,
    });
  },
}));
