// In-memory conversation and message store
// Will be replaced by PGlite in MIXA-046

import { randomUUID } from "node:crypto";
import type { Citation, ChatScope } from "@mixa-ai/types";

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

const conversations = new Map<string, StoredConversation>();
const messagesByConversation = new Map<string, StoredMessage[]>();

export function createConversation(
  title: string | null,
  scope: ChatScope | null,
): StoredConversation {
  const id = randomUUID();
  const now = new Date().toISOString();
  const conversation: StoredConversation = {
    id,
    title,
    scope,
    createdAt: now,
    updatedAt: now,
  };
  conversations.set(id, conversation);
  messagesByConversation.set(id, []);
  return conversation;
}

export function getConversation(id: string): StoredConversation | undefined {
  return conversations.get(id);
}

export function listConversations(
  limit: number,
  offset: number,
): { conversations: StoredConversation[]; total: number } {
  const all = Array.from(conversations.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return {
    conversations: all.slice(offset, offset + limit),
    total: all.length,
  };
}

export function deleteConversation(id: string): boolean {
  const deleted = conversations.delete(id);
  messagesByConversation.delete(id);
  return deleted;
}

export function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  citations: Citation[] = [],
  modelUsed: string | null = null,
): StoredMessage {
  const messages = messagesByConversation.get(conversationId);
  if (!messages) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  const message: StoredMessage = {
    id: randomUUID(),
    conversationId,
    role,
    content,
    citations,
    modelUsed,
    tokenCount: null,
    createdAt: new Date().toISOString(),
  };
  messages.push(message);

  // Update conversation timestamp
  const conversation = conversations.get(conversationId);
  if (conversation) {
    conversation.updatedAt = message.createdAt;
  }

  // Auto-title from first user message
  if (role === "user" && messages.length === 1 && conversation && !conversation.title) {
    conversation.title = content.length > 60 ? content.slice(0, 57) + "..." : content;
  }

  return message;
}

export function getMessages(conversationId: string): StoredMessage[] {
  return messagesByConversation.get(conversationId) ?? [];
}
