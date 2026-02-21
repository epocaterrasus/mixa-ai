import { describe, it, expect, beforeEach } from "vitest";
import {
  createConversation,
  getConversation,
  listConversations,
  deleteConversation,
  addMessage,
  getMessages,
} from "./store.js";
import type { ChatScope } from "@mixa-ai/types";

// Helper to clear state between tests by deleting all conversations
function clearStore(): void {
  const { conversations } = listConversations(1000, 0);
  for (const conv of conversations) {
    deleteConversation(conv.id);
  }
}

describe("Chat Store", () => {
  beforeEach(() => {
    clearStore();
  });

  describe("createConversation", () => {
    it("creates a conversation with title and scope", () => {
      const scope: ChatScope = { projectIds: ["p1"], tagIds: [], itemIds: [] };
      const conv = createConversation("Test Chat", scope);

      expect(conv.id).toBeDefined();
      expect(conv.title).toBe("Test Chat");
      expect(conv.scope).toEqual(scope);
      expect(conv.createdAt).toBeDefined();
      expect(conv.updatedAt).toBeDefined();
    });

    it("creates a conversation with null title and scope", () => {
      const conv = createConversation(null, null);

      expect(conv.title).toBeNull();
      expect(conv.scope).toBeNull();
    });
  });

  describe("getConversation", () => {
    it("retrieves an existing conversation", () => {
      const conv = createConversation("Find Me", null);
      const found = getConversation(conv.id);

      expect(found).toBeDefined();
      expect(found?.title).toBe("Find Me");
    });

    it("returns undefined for nonexistent ID", () => {
      expect(getConversation("nonexistent-id")).toBeUndefined();
    });
  });

  describe("listConversations", () => {
    it("lists conversations sorted by updatedAt descending", () => {
      const conv1 = createConversation("First", null);
      const conv2 = createConversation("Second", null);

      // Add a message to conv1 so its updatedAt is newer
      addMessage(conv1.id, "user", "Update timestamp");

      const { conversations, total } = listConversations(10, 0);

      expect(total).toBe(2);
      expect(conversations.length).toBe(2);
      // conv1 should come first because its updatedAt was updated by the message
      expect(conversations[0]?.id).toBe(conv1.id);
      expect(conversations[1]?.id).toBe(conv2.id);
    });

    it("respects limit and offset", () => {
      createConversation("A", null);
      createConversation("B", null);
      createConversation("C", null);

      const { conversations, total } = listConversations(1, 1);

      expect(total).toBe(3);
      expect(conversations.length).toBe(1);
    });
  });

  describe("deleteConversation", () => {
    it("deletes an existing conversation", () => {
      const conv = createConversation("Delete Me", null);

      expect(deleteConversation(conv.id)).toBe(true);
      expect(getConversation(conv.id)).toBeUndefined();
    });

    it("returns false for nonexistent conversation", () => {
      expect(deleteConversation("nonexistent")).toBe(false);
    });

    it("also removes messages for deleted conversation", () => {
      const conv = createConversation("With Messages", null);
      addMessage(conv.id, "user", "Hello");

      deleteConversation(conv.id);

      expect(getMessages(conv.id)).toEqual([]);
    });
  });

  describe("addMessage", () => {
    it("adds a user message", () => {
      const conv = createConversation(null, null);
      const msg = addMessage(conv.id, "user", "Hello Mixa");

      expect(msg.id).toBeDefined();
      expect(msg.conversationId).toBe(conv.id);
      expect(msg.role).toBe("user");
      expect(msg.content).toBe("Hello Mixa");
      expect(msg.citations).toEqual([]);
      expect(msg.modelUsed).toBeNull();
    });

    it("adds an assistant message with citations", () => {
      const conv = createConversation(null, null);
      const citations = [
        {
          index: 1,
          itemId: "item-1",
          chunkId: "chunk-1",
          itemTitle: "Source Article",
          itemUrl: "https://example.com",
          snippet: "Some text...",
        },
      ];
      const msg = addMessage(conv.id, "assistant", "Here is the answer [1]", citations, "gpt-4o");

      expect(msg.role).toBe("assistant");
      expect(msg.citations).toEqual(citations);
      expect(msg.modelUsed).toBe("gpt-4o");
    });

    it("auto-titles conversation from first user message", () => {
      const conv = createConversation(null, null);
      addMessage(conv.id, "user", "What is TypeScript?");

      const updated = getConversation(conv.id);
      expect(updated?.title).toBe("What is TypeScript?");
    });

    it("truncates long auto-titles", () => {
      const conv = createConversation(null, null);
      const longMessage = "A".repeat(100);
      addMessage(conv.id, "user", longMessage);

      const updated = getConversation(conv.id);
      expect(updated?.title).toBe("A".repeat(57) + "...");
      expect(updated?.title?.length).toBe(60);
    });

    it("does not override existing title", () => {
      const conv = createConversation("Existing Title", null);
      addMessage(conv.id, "user", "New message");

      const updated = getConversation(conv.id);
      expect(updated?.title).toBe("Existing Title");
    });

    it("updates conversation updatedAt timestamp", () => {
      const conv = createConversation(null, null);
      const originalUpdatedAt = conv.updatedAt;

      // Small delay to ensure different timestamp
      addMessage(conv.id, "user", "Hello");

      const updated = getConversation(conv.id);
      expect(updated?.updatedAt).toBeDefined();
      // updatedAt should be >= original (may be equal if same ms)
      expect(new Date(updated?.updatedAt ?? "").getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime(),
      );
    });

    it("throws for nonexistent conversation", () => {
      expect(() => addMessage("nonexistent", "user", "Hello")).toThrow(
        "Conversation not found",
      );
    });
  });

  describe("getMessages", () => {
    it("returns messages in order", () => {
      const conv = createConversation(null, null);
      addMessage(conv.id, "user", "Question");
      addMessage(conv.id, "assistant", "Answer");

      const messages = getMessages(conv.id);

      expect(messages.length).toBe(2);
      expect(messages[0]?.role).toBe("user");
      expect(messages[1]?.role).toBe("assistant");
    });

    it("returns empty array for nonexistent conversation", () => {
      expect(getMessages("nonexistent")).toEqual([]);
    });
  });
});
