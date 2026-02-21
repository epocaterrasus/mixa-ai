import { randomUUID } from "node:crypto";
import {
  extractArticle,
  extractThumbnail,
  sanitizeHtml,
} from "@mixa-ai/content-processor";
import { tabManager } from "../tabs/manager.js";

/** Result returned after successfully capturing content */
export interface CaptureResult {
  id: string;
  title: string;
  url: string | null;
  itemType: "article" | "highlight";
  domain: string | null;
  wordCount: number | null;
  readingTime: number | null;
}

/** Stored captured item (in-memory until PGlite is integrated in MIXA-046) */
export interface CapturedItem {
  id: string;
  url: string | null;
  title: string;
  description: string | null;
  contentText: string | null;
  contentHtml: string | null;
  itemType: string;
  sourceType: string;
  thumbnailUrl: string | null;
  faviconUrl: string | null;
  domain: string | null;
  wordCount: number | null;
  readingTime: number | null;
  isArchived: boolean;
  isFavorite: boolean;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isRestrictedUrl(url: string): boolean {
  const restricted = [
    "chrome://",
    "chrome-extension://",
    "about:",
    "devtools://",
    "electron://",
    "file://",
  ];
  return restricted.some((prefix) => url.startsWith(prefix));
}

/**
 * In-memory store for captured items.
 * This serves as the storage layer until PGlite is integrated (MIXA-046).
 * When PGlite is available, this will be replaced with Drizzle DB operations.
 */
class CaptureStore {
  private items: CapturedItem[] = [];

  add(item: CapturedItem): void {
    this.items.push(item);
  }

  findByUrl(url: string): CapturedItem | undefined {
    return this.items.find((item) => item.url === url);
  }

  update(id: string, updates: Partial<CapturedItem>): CapturedItem | undefined {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    const existing = this.items[index]!;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.items[index] = updated;
    return updated;
  }

  getAll(): CapturedItem[] {
    return [...this.items];
  }

  getById(id: string): CapturedItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  delete(id: string): boolean {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }

  count(): number {
    return this.items.length;
  }
}

export const captureStore = new CaptureStore();

/**
 * Capture the full page content from a web tab.
 * Extracts article content using Readability, sanitizes HTML,
 * extracts thumbnail, and stores the result.
 */
export async function captureTab(
  tabId: string,
  faviconUrl?: string | null,
): Promise<CaptureResult> {
  const url = tabManager.getURL(tabId);
  if (!url) {
    throw new Error("Cannot capture: tab has no URL");
  }

  if (isRestrictedUrl(url)) {
    throw new Error(
      `Cannot capture restricted page: ${url.split("://")[0]}:// pages cannot be saved`,
    );
  }

  // Check for duplicate URL
  const existing = captureStore.findByUrl(url);
  if (existing) {
    // Update existing item instead of creating duplicate
    const html = await tabManager.getPageHTML(tabId);
    if (html) {
      const article = extractArticle(html, url);
      const thumbnail = extractThumbnail(html, url);

      captureStore.update(existing.id, {
        title: article?.title ?? existing.title,
        contentText: article?.textContent ?? existing.contentText,
        contentHtml: article?.content ?? (html ? sanitizeHtml(html) : existing.contentHtml),
        thumbnailUrl: thumbnail?.url ?? existing.thumbnailUrl,
        faviconUrl: faviconUrl ?? existing.faviconUrl,
        wordCount: article?.wordCount ?? existing.wordCount,
        readingTime: article?.readingTime ?? existing.readingTime,
      });
    }

    return {
      id: existing.id,
      title: existing.title,
      url: existing.url,
      itemType: "article",
      domain: existing.domain,
      wordCount: existing.wordCount,
      readingTime: existing.readingTime,
    };
  }

  const html = await tabManager.getPageHTML(tabId);
  if (!html) {
    throw new Error("Cannot capture: failed to extract page HTML");
  }

  const article = extractArticle(html, url);
  const thumbnail = extractThumbnail(html, url);
  const domain = extractDomain(url);

  const now = new Date().toISOString();
  const id = randomUUID();

  const item: CapturedItem = {
    id,
    url,
    title: article?.title ?? url,
    description: article?.excerpt ?? null,
    contentText: article?.textContent ?? null,
    contentHtml: article?.content ?? sanitizeHtml(html),
    itemType: "article",
    sourceType: "manual",
    thumbnailUrl: thumbnail?.url ?? null,
    faviconUrl: faviconUrl ?? null,
    domain,
    wordCount: article?.wordCount ?? null,
    readingTime: article?.readingTime ?? null,
    isArchived: false,
    isFavorite: false,
    capturedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  captureStore.add(item);

  return {
    id: item.id,
    title: item.title,
    url: item.url,
    itemType: "article",
    domain: item.domain,
    wordCount: item.wordCount,
    readingTime: item.readingTime,
  };
}

/**
 * Capture a text selection from a web tab as a highlight item.
 */
export async function captureSelection(
  tabId: string,
  selectedText: string,
  faviconUrl?: string | null,
): Promise<CaptureResult> {
  const url = tabManager.getURL(tabId);
  const domain = url ? extractDomain(url) : null;
  const sanitizedText = sanitizeHtml(
    `<blockquote>${selectedText}</blockquote>`,
  );

  const now = new Date().toISOString();
  const id = randomUUID();

  // Generate a title from the first line of the selection
  const titleText = selectedText.slice(0, 100).split("\n")[0] ?? selectedText.slice(0, 100);
  const title = titleText.length < selectedText.length
    ? `${titleText}...`
    : titleText;

  const wordCount = selectedText.split(/\s+/).filter((w) => w.length > 0).length;

  const item: CapturedItem = {
    id,
    url,
    title,
    description: null,
    contentText: selectedText,
    contentHtml: sanitizedText,
    itemType: "highlight",
    sourceType: "manual",
    thumbnailUrl: null,
    faviconUrl: faviconUrl ?? null,
    domain,
    wordCount,
    readingTime: Math.max(1, Math.ceil(wordCount / 200)),
    isArchived: false,
    isFavorite: false,
    capturedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  captureStore.add(item);

  return {
    id: item.id,
    title: item.title,
    url: item.url,
    itemType: "highlight",
    domain: item.domain,
    wordCount: item.wordCount,
    readingTime: item.readingTime,
  };
}
