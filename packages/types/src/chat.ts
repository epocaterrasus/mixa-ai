// @mixa-ai/types — Chat & RAG domain types

/** Role of a message in a conversation */
export type MessageRole = "user" | "assistant";

/** Scoping for a conversation — limits RAG search context */
export interface ChatScope {
  projectIds: string[];
  tagIds: string[];
  itemIds: string[];
}

/** A citation linking a response to a source chunk/item */
export interface Citation {
  index: number;
  itemId: string;
  chunkId: string;
  itemTitle: string;
  itemUrl: string | null;
  snippet: string;
}

/** A single message within a conversation */
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  citations: Citation[];
  modelUsed: string | null;
  tokenCount: number | null;
  createdAt: string;
}

/** A RAG-based conversation */
export interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  scope: ChatScope | null;
  createdAt: string;
  updatedAt: string;
}
