import { describe, it, expect, beforeEach, vi } from "vitest";

const mockInsertReturning = vi.fn();
const mockSelectRows = vi.fn();
const mockDeleteReturning = vi.fn();
const mockUpdateSet = vi.fn();

vi.mock("../db/index.js", () => ({
  getDb: () => ({
    insert: () => ({
      values: () => ({
        returning: mockInsertReturning,
      }),
    }),
    select: () => ({
      from: () => ({
        where: (..._: unknown[]) => ({
          orderBy: () => mockSelectRows(),
          limit: mockSelectRows,
        }),
        orderBy: () => ({
          limit: () => ({
            offset: mockSelectRows,
          }),
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: mockUpdateSet,
      }),
    }),
    delete: () => ({
      where: () => ({
        returning: mockDeleteReturning,
      }),
    }),
  }),
  getUserId: () => "user-001",
}));

vi.mock("@mixa-ai/db", () => ({
  conversations: { id: "id", userId: "user_id", updatedAt: "updated_at", title: "title" },
  messages: { id: "id", conversationId: "conversation_id", createdAt: "created_at" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "eq-filter"),
  desc: vi.fn(() => "desc-order"),
}));

describe("Chat Store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createConversation returns a stored conversation", async () => {
    const now = new Date();
    mockInsertReturning.mockResolvedValue([{
      id: "conv-1",
      userId: "user-001",
      title: "Test Chat",
      scope: { projectIds: [], tagIds: [], itemIds: [] },
      createdAt: now,
      updatedAt: now,
    }]);

    const { createConversation } = await import("./store.js");
    const conv = await createConversation("Test Chat", null);

    expect(conv.id).toBe("conv-1");
    expect(conv.title).toBe("Test Chat");
    expect(conv.createdAt).toBeDefined();
  });

  it("getConversation returns undefined for missing ID", async () => {
    mockSelectRows.mockResolvedValue([]);

    const { getConversation } = await import("./store.js");
    const result = await getConversation("nonexistent");

    expect(result).toBeUndefined();
  });

  it("deleteConversation returns false for nonexistent", async () => {
    mockDeleteReturning.mockResolvedValue([]);

    const { deleteConversation } = await import("./store.js");
    const result = await deleteConversation("nonexistent");

    expect(result).toBe(false);
  });

  it("deleteConversation returns true for existing", async () => {
    mockDeleteReturning.mockResolvedValue([{ id: "conv-1" }]);

    const { deleteConversation } = await import("./store.js");
    const result = await deleteConversation("conv-1");

    expect(result).toBe(true);
  });

  it("addMessage inserts and returns the message", async () => {
    const now = new Date();
    mockInsertReturning.mockResolvedValue([{
      id: "msg-1",
      conversationId: "conv-1",
      role: "user",
      content: "Hello Mixa",
      citations: [],
      modelUsed: null,
      tokenCount: null,
      createdAt: now,
    }]);
    mockUpdateSet.mockResolvedValue(undefined);
    mockSelectRows.mockResolvedValue([{ id: "msg-1" }]);

    const { addMessage } = await import("./store.js");
    const msg = await addMessage("conv-1", "user", "Hello Mixa");

    expect(msg.id).toBe("msg-1");
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello Mixa");
    expect(msg.citations).toEqual([]);
  });

  it("getMessages returns messages in order", async () => {
    const now = new Date();
    mockSelectRows.mockResolvedValue([
      { id: "m1", conversationId: "c1", role: "user", content: "Q", citations: [], modelUsed: null, tokenCount: null, createdAt: now },
      { id: "m2", conversationId: "c1", role: "assistant", content: "A", citations: [], modelUsed: "gpt-4o", tokenCount: 50, createdAt: now },
    ]);

    const { getMessages } = await import("./store.js");
    const msgs = await getMessages("c1");

    expect(msgs).toHaveLength(2);
    expect(msgs[0]?.role).toBe("user");
    expect(msgs[1]?.role).toBe("assistant");
  });

  it("getMessages returns empty for nonexistent conversation", async () => {
    mockSelectRows.mockResolvedValue([]);

    const { getMessages } = await import("./store.js");
    const msgs = await getMessages("nonexistent");

    expect(msgs).toEqual([]);
  });
});
