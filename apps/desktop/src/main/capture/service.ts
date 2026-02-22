import {
  extractArticle,
  extractThumbnail,
  sanitizeHtml,
} from "@mixa-ai/content-processor";
import { items } from "@mixa-ai/db";
import { eq } from "drizzle-orm";
import { tabManager } from "../tabs/manager.js";
import { getDb, getUserId } from "../db/index.js";

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
 * Capture the full page content from a web tab.
 * Extracts article content using Readability, sanitizes HTML,
 * extracts thumbnail, and stores the result in PGlite.
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

  const db = getDb();
  const userId = getUserId();

  // Check for duplicate URL
  const [existing] = await db
    .select()
    .from(items)
    .where(eq(items.url, url))
    .limit(1);

  if (existing) {
    const html = await tabManager.getPageHTML(tabId);
    if (html) {
      const article = extractArticle(html, url);
      const thumbnail = extractThumbnail(html, url);

      await db
        .update(items)
        .set({
          title: article?.title ?? existing.title,
          contentText: article?.textContent ?? existing.contentText,
          contentHtml: article?.content ?? (html ? sanitizeHtml(html) : existing.contentHtml),
          thumbnailUrl: thumbnail?.url ?? existing.thumbnailUrl,
          faviconUrl: faviconUrl ?? existing.faviconUrl,
          wordCount: article?.wordCount ?? existing.wordCount,
          readingTime: article?.readingTime ?? existing.readingTime,
          updatedAt: new Date(),
        })
        .where(eq(items.id, existing.id));
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

  const [created] = await db
    .insert(items)
    .values({
      userId,
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
    })
    .returning();

  if (!created) throw new Error("Failed to insert captured item");

  return {
    id: created.id,
    title: created.title,
    url: created.url,
    itemType: "article",
    domain: created.domain,
    wordCount: created.wordCount,
    readingTime: created.readingTime,
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

  const titleText = selectedText.slice(0, 100).split("\n")[0] ?? selectedText.slice(0, 100);
  const title = titleText.length < selectedText.length
    ? `${titleText}...`
    : titleText;

  const wordCount = selectedText.split(/\s+/).filter((w) => w.length > 0).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const db = getDb();
  const userId = getUserId();

  const [created] = await db
    .insert(items)
    .values({
      userId,
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
      readingTime,
    })
    .returning();

  if (!created) throw new Error("Failed to insert captured selection");

  return {
    id: created.id,
    title: created.title,
    url: created.url,
    itemType: "highlight",
    domain: created.domain,
    wordCount: created.wordCount,
    readingTime: created.readingTime,
  };
}
