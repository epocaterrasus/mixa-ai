import type { BrowserWindow } from "electron";
import { captureStore, type CapturedItem } from "../capture/service.js";
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

function extractWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

/**
 * Score how related a captured item is to the current page.
 * Returns 0 if not related, up to 1.0 for exact URL match.
 */
function scoreRelevance(
  item: CapturedItem,
  pageUrl: string,
  pageDomain: string | null,
  pageTitle: string,
): number {
  // Exact URL match
  if (item.url === pageUrl) {
    return 1.0;
  }

  let score = 0;

  // Same domain bonus
  if (pageDomain && item.domain === pageDomain) {
    score += 0.4;
  }

  // Title word overlap
  const pageWords = extractWords(pageTitle);
  const itemWords = extractWords(item.title);
  if (pageWords.size > 0 && itemWords.size > 0) {
    let overlap = 0;
    for (const word of pageWords) {
      if (itemWords.has(word)) {
        overlap += 1;
      }
    }
    const overlapRatio = overlap / Math.max(pageWords.size, itemWords.size);
    score += overlapRatio * 0.5;
  }

  // Content overlap with page title
  if (item.contentText) {
    const contentLower = item.contentText.toLowerCase();
    const titleLower = pageTitle.toLowerCase();
    if (titleLower.length > 5 && contentLower.includes(titleLower)) {
      score += 0.3;
    }
  }

  return Math.min(score, 0.99); // Cap below exact match
}

function toRelatedItem(item: CapturedItem, score: number): RelatedItem {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    domain: item.domain,
    summary: item.description,
    score,
    capturedAt: item.capturedAt,
    itemType: item.itemType,
    faviconUrl: item.faviconUrl,
  };
}

/**
 * Find items in the knowledge base related to the given page.
 */
export function findRelatedItems(
  pageUrl: string,
  pageTitle: string,
  limit: number = 10,
  minScore: number = 0.2,
): RelatedItem[] {
  const allItems = captureStore.getAll();
  if (allItems.length === 0) return [];

  const pageDomain = extractDomain(pageUrl);

  const scored: Array<{ item: CapturedItem; score: number }> = [];

  for (const item of allItems) {
    const score = scoreRelevance(item, pageUrl, pageDomain, pageTitle);
    if (score >= minScore) {
      scored.push({ item, score });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => toRelatedItem(s.item, s.score));
}

/**
 * Augmented Browsing Service.
 * Monitors tab navigation and checks for related items in the knowledge base.
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

    // Extract page title via executeJavaScript on the web view
    let pageTitle = "";
    try {
      pageTitle = await tabManager.getPageTitle(tabId) ?? "";
    } catch {
      pageTitle = "";
    }

    const relatedItems = findRelatedItems(url, pageTitle);
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
