// @mixa-ai/types — Knowledge domain types

/** Classification of a saved knowledge item */
export type ItemType =
  | "article"
  | "highlight"
  | "youtube"
  | "pdf"
  | "code"
  | "image"
  | "terminal";

/** How the item was captured */
export type SourceType = "manual" | "auto_capture" | "extension" | "terminal";

/** A saved knowledge item (article, highlight, code snippet, etc.) */
export interface Item {
  id: string;
  userId: string;
  url: string | null;
  title: string;
  description: string | null;
  contentText: string | null;
  contentHtml: string | null;
  itemType: ItemType;
  sourceType: SourceType;
  thumbnailUrl: string | null;
  faviconUrl: string | null;
  domain: string | null;
  wordCount: number | null;
  readingTime: number | null;
  summary: string | null;
  isArchived: boolean;
  isFavorite: boolean;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** A text chunk with embedding for RAG retrieval */
export interface Chunk {
  id: string;
  itemId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embedding: number[] | null;
  createdAt: string;
}

/** A user-defined tag for categorizing items */
export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

/** Association between an item and a tag, with relevance score */
export interface ItemTag {
  itemId: string;
  tagId: string;
  score: number;
}

/** A text highlight within a saved item */
export interface Highlight {
  id: string;
  itemId: string;
  text: string;
  note: string | null;
  color: string | null;
  selectorData: Record<string, unknown> | null;
  createdAt: string;
}
