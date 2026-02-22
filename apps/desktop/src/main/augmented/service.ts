import type { BrowserWindow } from "electron";
import { eq } from "drizzle-orm";
import { items } from "@mixa-ai/db";
import { getDb, getUserId } from "../db/index.js";
import { tabManager } from "../tabs/manager.js";

/** A related item found in the knowledge base for the current page */
export interface RelatedItem {
  id: string;
  title: string;
  url: string | null;
  domain: string | null;
  summary: string | null;
  score: number;
  capturedAt: string;
  itemType: string;
  faviconUrl: string | null;
}

/** Result sent to renderer when related items are found */
export interface AugmentedResult {
  tabId: string;
  relatedItems: RelatedItem[];
}

const RESTRICTED_PREFIXES = [
  "chrome://",
  "chrome-extension://",
  "about:",
  "devtools://",
  "electron://",
  "file://",
];

/** Common English stopwords to filter from word matching */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "its", "this", "that", "are",
  "was", "were", "be", "been", "has", "have", "had", "do", "does", "did",
  "will", "can", "could", "should", "would", "may", "not", "no", "all",
  "how", "what", "when", "where", "who", "which", "why", "new", "you",
  "your", "we", "our", "they", "their", "about", "into", "just", "also",
]);

function isRestrictedUrl(url: string): boolean {
  return RESTRICTED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function extractPathSegments(url: string): string[] {
  try {
    const parsed = new URL(url);
    return parsed.pathname
      .split("/")
      .filter((seg) => seg.length > 2)
      .map((seg) => seg.toLowerCase().replace(/[^a-z0-9]/g, " ").trim())
      .filter((seg) => seg.length > 2);
  } catch {
    return [];
  }
}

function extractWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

/** Page metadata used for finding related items */
export interface PageContext {
  url: string;
  title: string;
  description: string;
}

type ItemRow = typeof items.$inferSelect;

/**
 * Score how related a captured item is to the current page.
 * Returns 0 if not related, up to 1.0 for exact URL match.
 */
function scoreRelevance(item: ItemRow, context: PageContext): number {
  if (item.url === context.url) {
    return 1.0;
  }

  let score = 0;
  const pageDomain = extractDomain(context.url);

  if (pageDomain && item.domain === pageDomain) {
    score += 0.3;
  }

  const pageWords = extractWords(context.title);
  const itemWords = extractWords(item.title);
  if (pageWords.size > 0 && itemWords.size > 0) {
    let overlap = 0;
    for (const word of pageWords) {
      if (itemWords.has(word)) {
        overlap += 1;
      }
    }
    const overlapRatio = overlap / Math.max(pageWords.size, itemWords.size);
    score += overlapRatio * 0.35;
  }

  if (context.description.length > 10) {
    const descWords = extractWords(context.description);
    if (descWords.size > 0) {
      const itemTextWords = new Set<string>();
      for (const w of itemWords) itemTextWords.add(w);
      if (item.description) {
        for (const w of extractWords(item.description)) itemTextWords.add(w);
      }

      if (itemTextWords.size > 0) {
        let descOverlap = 0;
        for (const word of descWords) {
          if (itemTextWords.has(word)) {
            descOverlap += 1;
          }
        }
        const descRatio = descOverlap / Math.max(descWords.size, itemTextWords.size);
        score += descRatio * 0.2;
      }
    }
  }

  if (item.contentText && context.title.length > 5) {
    const contentLower = item.contentText.toLowerCase();
    const titleLower = context.title.toLowerCase();
    if (contentLower.includes(titleLower)) {
      score += 0.15;
    }
  }

  const pageSegments = extractPathSegments(context.url);
  if (pageSegments.length > 0 && item.url) {
    const itemSegments = extractPathSegments(item.url);
    if (itemSegments.length > 0) {
      let segOverlap = 0;
      for (const seg of pageSegments) {
        if (itemSegments.some((is) => is.includes(seg) || seg.includes(is))) {
          segOverlap += 1;
        }
      }
      const segRatio = segOverlap / Math.max(pageSegments.length, itemSegments.length);
      score += segRatio * 0.15;
    }
  }

  return Math.min(score, 0.99);
}

function toRelatedItem(item: ItemRow, score: number): RelatedItem {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    domain: item.domain,
    summary: item.description,
    score,
    capturedAt: item.capturedAt.toISOString(),
    itemType: item.itemType,
    faviconUrl: item.faviconUrl,
  };
}

/**
 * Find items in the knowledge base related to the given page.
 */
export async function findRelatedItems(
  context: PageContext,
  limit: number = 10,
  minScore: number = 0.2,
): Promise<RelatedItem[]> {
  const db = getDb();
  const allItems = await db
    .select()
    .from(items)
    .where(eq(items.userId, getUserId()));

  if (allItems.length === 0) return [];

  const scored: Array<{ item: ItemRow; score: number }> = [];

  for (const item of allItems) {
    const score = scoreRelevance(item, context);
    if (score >= minScore) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => toRelatedItem(s.item, s.score));
}

/**
 * Augmented Browsing Service.
 * Monitors tab navigation and checks for related items in the knowledge base.
 * When related items are found, sends them to the renderer to show an indicator.
 */
export class AugmentedBrowsingService {
  private mainWindow: BrowserWindow | null = null;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private enabled = true;

  /** Debounce delay in ms (2 seconds after page load) */
  private static readonly DEBOUNCE_MS = 2000;

  attach(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      // Clear all pending checks
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.debounceTimers.clear();
    }
  }

  /**
   * Called when a tab finishes loading. Schedules a related items check
   * after the debounce delay.
   */
  onPageLoaded(tabId: string): void {
    if (!this.enabled) return;

    // Cancel any pending check for this tab
    const existing = this.debounceTimers.get(tabId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(tabId);
      void this.checkRelatedItems(tabId);
    }, AugmentedBrowsingService.DEBOUNCE_MS);

    this.debounceTimers.set(tabId, timer);
  }

  /**
   * Called when a tab is destroyed. Cleans up any pending checks.
   */
  onTabDestroyed(tabId: string): void {
    const timer = this.debounceTimers.get(tabId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(tabId);
    }
  }

  private async checkRelatedItems(tabId: string): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const url = tabManager.getURL(tabId);
    if (!url || isRestrictedUrl(url)) {
      // Send empty result to clear any previous indicator
      this.sendResult({ tabId, relatedItems: [] });
      return;
    }

    // Extract page title and meta description for better matching
    let pageTitle = "";
    let pageDescription = "";
    try {
      pageTitle = await tabManager.getPageTitle(tabId) ?? "";
    } catch {
      pageTitle = "";
    }
    try {
      pageDescription = await tabManager.getPageMetaDescription(tabId) ?? "";
    } catch {
      pageDescription = "";
    }

    const context: PageContext = {
      url,
      title: pageTitle,
      description: pageDescription,
    };

    const relatedItems = await findRelatedItems(context);
    this.sendResult({ tabId, relatedItems });
  }

  private sendResult(result: AugmentedResult): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.webContents.send("augmented:related-items", result);
  }

  destroy(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.mainWindow = null;
  }
}

export const augmentedBrowsingService = new AugmentedBrowsingService();
