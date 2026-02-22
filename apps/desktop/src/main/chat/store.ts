import { randomUUID } from "node:crypto";
import { eq, desc } from "drizzle-orm";
import { conversations, messages } from "@mixa-ai/db";
import type { Citation, ChatScope } from "@mixa-ai/types";
import type { PgliteDbClient } from "@mixa-ai/db";
import { getDb, getUserId } from "../db/index.js";

export interface StoredConversation {
  id: string;
  title: string | null;
  scope: ChatScope | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  modelUsed: string | null;
  tokenCount: number | null;
  createdAt: string;
}

function toStoredConversation(row: typeof conversations.$inferSelect): StoredConversation {
  return {
    id: row.id,
    title: row.title,
    scope: row.scope as ChatScope | null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toStoredMessage(row: typeof messages.$inferSelect): StoredMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as "user" | "assistant",
    content: row.content,
    citations: (row.citations ?? []) as Citation[],
    modelUsed: row.modelUsed,
    tokenCount: row.tokenCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createConversation(
  title: string | null,
  scope: ChatScope | null,
): Promise<StoredConversation> {
  const db = getDb();
  const [created] = await db
    .insert(conversations)
    .values({
      userId: getUserId(),
      title,
      scope: scope as Record<string, unknown> | null,
    })
    .returning();

  if (!created) throw new Error("Failed to create conversation");
  return toStoredConversation(created);
}

export async function getConversation(id: string): Promise<StoredConversation | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  return row ? toStoredConversation(row) : undefined;
}

export async function listConversations(
  limit: number,
  offset: number,
): Promise<{ conversations: StoredConversation[]; total: number }> {
  const db = getDb();
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, getUserId()))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit)
    .offset(offset);

  const allRows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.userId, getUserId()));

  return {
    conversations: rows.map(toStoredConversation),
    total: allRows.length,
  };
}

export async function deleteConversation(id: string): Promise<boolean> {
  const db = getDb();
  const [deleted] = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning({ id: conversations.id });
  return !!deleted;
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  citations: Citation[] = [],
  modelUsed: string | null = null,
): Promise<StoredMessage> {
  const db = getDb();

  const [created] = await db
    .insert(messages)
    .values({
      conversationId,
      role,
      content,
      citations: citations as unknown as Record<string, unknown>[],
      modelUsed,
    })
    .returning();

  if (!created) throw new Error("Failed to create message");

  // Update conversation timestamp
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  // Auto-title from first user message
  if (role === "user") {
    const allMsgs = await db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));

    if (allMsgs.length === 1) {
      const [conv] = await db
        .select({ title: conversations.title })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (conv && !conv.title) {
        const autoTitle = content.length > 60 ? content.slice(0, 57) + "..." : content;
        await db
          .update(conversations)
          .set({ title: autoTitle })
          .where(eq(conversations.id, conversationId));
      }
    }
  }

  return toStoredMessage(created);
}

export async function getMessages(conversationId: string): Promise<StoredMessage[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return rows.map(toStoredMessage);
}
