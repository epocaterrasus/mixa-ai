import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { BrowserWindow } from "electron";

// Mock the tabManager before importing the service
vi.mock("../tabs/manager.js", () => ({
  tabManager: {
    getURL: vi.fn(),
    getPageTitle: vi.fn(),
    getPageMetaDescription: vi.fn(),
    getPageHTML: vi.fn(),
  },
}));

// Mock the captureStore
vi.mock("../capture/service.js", () => {
  const items: Array<{
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
  }> = [];

  return {
    captureStore: {
      getAll: () => [...items],
      add: (item: (typeof items)[number]) => {
        items.push(item);
      },
      _clear: () => {
        items.length = 0;
      },
    },
  };
});

import {
  findRelatedItems,
  AugmentedBrowsingService,
  type PageContext,
} from "./service.js";
import { tabManager } from "../tabs/manager.js";
import { captureStore } from "../capture/service.js";

/** Helper to clear mock store between tests */
function clearStore(): void {
  (captureStore as unknown as { _clear: () => void })._clear();
}

function makeCapturedItem(overrides: {
  id: string;
  title: string;
  url?: string;
  domain?: string;
  contentText?: string;
  description?: string;
  faviconUrl?: string;
  itemType?: string;
}): void {
  const now = new Date().toISOString();
  (captureStore as unknown as { add: (item: Record<string, unknown>) => void }).add({
    id: overrides.id,
    url: overrides.url ?? null,
    title: overrides.title,
    description: overrides.description ?? null,
    contentText: overrides.contentText ?? null,
    contentHtml: null,
    itemType: overrides.itemType ?? "article",
    sourceType: "manual",
    thumbnailUrl: null,
    faviconUrl: overrides.faviconUrl ?? null,
    domain: overrides.domain ?? null,
    wordCount: null,
    readingTime: null,
    isArchived: false,
    isFavorite: false,
    capturedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

/** Helper to create a PageContext */
function ctx(url: string, title: string, description: string = ""): PageContext {
  return { url, title, description };
}

describe("findRelatedItems", () => {
  beforeEach(() => {
    clearStore();
  });

  it("returns empty array when no items in store", () => {
    const result = findRelatedItems(ctx("https://example.com", "Test Page"));
    expect(result).toEqual([]);
  });

  it("returns exact URL match with score 1.0", () => {
    makeCapturedItem({
      id: "item-1",
      title: "Saved Article",
      url: "https://example.com/article",
      domain: "example.com",
    });

    const result = findRelatedItems(
      ctx("https://example.com/article", "Some Page"),
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("item-1");
    expect(result[0]?.score).toBe(1.0);
  });

  it("scores same-domain items higher", () => {
    makeCapturedItem({
      id: "same-domain",
      title: "Other Article",
      url: "https://example.com/other",
      domain: "example.com",
    });
    makeCapturedItem({
      id: "diff-domain",
      title: "Other Article",
      url: "https://different.com/page",
      domain: "different.com",
    });

    const result = findRelatedItems(
      ctx("https://example.com/page", "Unrelated Title"),
    );

    // Same domain should score higher
    const sameDomain = result.find((r) => r.id === "same-domain");
    const diffDomain = result.find((r) => r.id === "diff-domain");

    expect(sameDomain).toBeDefined();
    // Different domain with no title overlap may not meet minScore
    if (diffDomain) {
      expect(sameDomain!.score).toBeGreaterThan(diffDomain.score);
    }
  });

  it("scores title word overlap", () => {
    makeCapturedItem({
      id: "title-match",
      title: "Building React Components with TypeScript",
      url: "https://blog.com/react-ts",
      domain: "blog.com",
    });

    // Cross-domain title overlap alone may produce a score below default 0.2
    // threshold due to stopword filtering, so use a lower minScore
    const result = findRelatedItems(
      ctx("https://other.com/tutorial", "React Components Tutorial"),
      10,
      0.1,
    );

    const match = result.find((r) => r.id === "title-match");
    expect(match).toBeDefined();
    expect(match!.score).toBeGreaterThan(0);
  });

  it("scores content overlap when page title appears in content", () => {
    makeCapturedItem({
      id: "content-match",
      title: "My Saved Article",
      url: "https://blog.com/saved",
      domain: "blog.com",
      contentText:
        "This article discusses how to build React applications with modern tools and frameworks.",
    });

    // Content overlap alone (+0.15) may not reach default 0.2 threshold,
    // so use a lower minScore to verify the scoring mechanism works
    const result = findRelatedItems(
      ctx("https://other.com/page", "build React applications"),
      10,
      0.1,
    );

    const match = result.find((r) => r.id === "content-match");
    expect(match).toBeDefined();
    expect(match!.score).toBeGreaterThan(0);
  });

  it("filters items below minScore", () => {
    makeCapturedItem({
      id: "low-rel",
      title: "Completely unrelated topic about cooking",
      url: "https://cooking.com/recipe",
      domain: "cooking.com",
    });

    const result = findRelatedItems(
      ctx("https://dev.to/article", "Advanced Kubernetes Deployment Strategies"),
      10,
      0.2,
    );

    expect(result).toHaveLength(0);
  });

  it("limits results to specified count", () => {
    for (let i = 0; i < 20; i++) {
      makeCapturedItem({
        id: `item-${i}`,
        title: `Test Article ${i}`,
        url: `https://example.com/article-${i}`,
        domain: "example.com",
      });
    }

    const result = findRelatedItems(
      ctx("https://example.com/new-page", "Test Article"),
      5,
    );

    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("sorts results by score descending", () => {
    makeCapturedItem({
      id: "exact",
      title: "Exact Match",
      url: "https://example.com/exact",
      domain: "example.com",
    });
    makeCapturedItem({
      id: "partial",
      title: "Different Title",
      url: "https://example.com/other",
      domain: "example.com",
    });

    const result = findRelatedItems(
      ctx("https://example.com/exact", "Exact Match"),
    );

    if (result.length >= 2) {
      expect(result[0]!.score).toBeGreaterThanOrEqual(result[1]!.score);
    }
  });

  it("caps non-exact-match scores below 1.0", () => {
    makeCapturedItem({
      id: "high-rel",
      title: "Same exact title here",
      url: "https://example.com/different-url",
      domain: "example.com",
      contentText: "This article discusses same exact title here extensively",
    });

    const result = findRelatedItems(
      ctx("https://example.com/page", "Same exact title here"),
    );

    const match = result.find((r) => r.id === "high-rel");
    expect(match).toBeDefined();
    expect(match!.score).toBeLessThan(1.0);
  });

  it("returns correct RelatedItem shape", () => {
    makeCapturedItem({
      id: "shape-test",
      title: "Shape Test Article",
      url: "https://example.com/shape",
      domain: "example.com",
      description: "A test summary",
      faviconUrl: "https://example.com/favicon.ico",
      itemType: "article",
    });

    const result = findRelatedItems(
      ctx("https://example.com/shape", "Shape Test"),
    );

    expect(result).toHaveLength(1);
    const item = result[0]!;
    expect(item).toHaveProperty("id", "shape-test");
    expect(item).toHaveProperty("title", "Shape Test Article");
    expect(item).toHaveProperty("url", "https://example.com/shape");
    expect(item).toHaveProperty("domain", "example.com");
    expect(item).toHaveProperty("summary", "A test summary");
    expect(item).toHaveProperty("faviconUrl", "https://example.com/favicon.ico");
    expect(item).toHaveProperty("itemType", "article");
    expect(item).toHaveProperty("score");
    expect(item).toHaveProperty("capturedAt");
  });

  it("uses page description for scoring", () => {
    makeCapturedItem({
      id: "desc-match",
      title: "Kubernetes Guide",
      url: "https://blog.com/k8s",
      domain: "blog.com",
      description: "Learn about container orchestration and deployment",
    });

    // Cross-domain description similarity alone may not reach 0.2 threshold,
    // so use a lower minScore to verify the scoring mechanism works
    const result = findRelatedItems(
      ctx(
        "https://other.com/containers",
        "Container Orchestration",
        "A guide to container orchestration and deployment strategies",
      ),
      10,
      0.1,
    );

    const match = result.find((r) => r.id === "desc-match");
    expect(match).toBeDefined();
    expect(match!.score).toBeGreaterThan(0);
  });
});

describe("AugmentedBrowsingService", () => {
  let service: AugmentedBrowsingService;
  let mockWindow: {
    isDestroyed: ReturnType<typeof vi.fn>;
    webContents: { send: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    clearStore();

    service = new AugmentedBrowsingService();
    mockWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: { send: vi.fn() },
    };
    service.attach(mockWindow as unknown as BrowserWindow);
  });

  afterEach(() => {
    service.destroy();
    vi.useRealTimers();
  });

  it("debounces page load checks for 2 seconds", () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com");
    mockedManager.getPageTitle.mockResolvedValue("Test Page");
    mockedManager.getPageMetaDescription.mockResolvedValue("");

    service.onPageLoaded("tab-1");

    // Should not have sent result yet
    expect(mockWindow.webContents.send).not.toHaveBeenCalled();

    // Advance past debounce
    vi.advanceTimersByTime(2000);

    // Allow async checkRelatedItems to resolve
    return vi.waitFor(() => {
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        "augmented:related-items",
        expect.objectContaining({ tabId: "tab-1" }),
      );
    });
  });

  it("cancels pending check on rapid navigation", () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com");
    mockedManager.getPageTitle.mockResolvedValue("Page");
    mockedManager.getPageMetaDescription.mockResolvedValue("");

    // Rapid navigations
    service.onPageLoaded("tab-1");
    vi.advanceTimersByTime(500);
    service.onPageLoaded("tab-1");
    vi.advanceTimersByTime(500);
    service.onPageLoaded("tab-1");

    // At this point only 500ms from last call, should not have sent
    expect(mockWindow.webContents.send).not.toHaveBeenCalled();
  });

  it("sends empty result for restricted URLs", () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("chrome://settings");

    service.onPageLoaded("tab-1");
    vi.advanceTimersByTime(2000);

    return vi.waitFor(() => {
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        "augmented:related-items",
        { tabId: "tab-1", relatedItems: [] },
      );
    });
  });

  it("sends empty result when tab has no URL", () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue(null);

    service.onPageLoaded("tab-1");
    vi.advanceTimersByTime(2000);

    return vi.waitFor(() => {
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        "augmented:related-items",
        { tabId: "tab-1", relatedItems: [] },
      );
    });
  });

  it("does not check when disabled", () => {
    service.setEnabled(false);
    service.onPageLoaded("tab-1");
    vi.advanceTimersByTime(5000);

    expect(mockWindow.webContents.send).not.toHaveBeenCalled();
  });

  it("clears pending timers when disabled", () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com");

    service.onPageLoaded("tab-1");
    vi.advanceTimersByTime(1000); // 1s into 2s debounce

    // Disable — should clear pending
    service.setEnabled(false);
    vi.advanceTimersByTime(2000);

    expect(mockWindow.webContents.send).not.toHaveBeenCalled();
  });

  it("cleans up on tab destroy", () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com");

    service.onPageLoaded("tab-1");
    service.onTabDestroyed("tab-1");
    vi.advanceTimersByTime(5000);

    expect(mockWindow.webContents.send).not.toHaveBeenCalled();
  });

  it("does not send when window is destroyed", () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com");
    mockedManager.getPageTitle.mockResolvedValue("Page");
    mockedManager.getPageMetaDescription.mockResolvedValue("");

    service.onPageLoaded("tab-1");
    mockWindow.isDestroyed.mockReturnValue(true);
    vi.advanceTimersByTime(2000);

    return vi.waitFor(() => {
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  it("sends related items when knowledge base has matches", () => {
    makeCapturedItem({
      id: "match-1",
      title: "JavaScript Testing Guide",
      url: "https://example.com/testing",
      domain: "example.com",
    });

    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com/testing");
    mockedManager.getPageTitle.mockResolvedValue("Testing Guide");
    mockedManager.getPageMetaDescription.mockResolvedValue("");

    service.onPageLoaded("tab-1");
    vi.advanceTimersByTime(2000);

    return vi.waitFor(() => {
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        "augmented:related-items",
        expect.objectContaining({
          tabId: "tab-1",
          relatedItems: expect.arrayContaining([
            expect.objectContaining({ id: "match-1" }),
          ]) as unknown,
        }),
      );
    });
  });

  it("handles multiple tabs independently", () => {
    const mockedManager = vi.mocked(tabManager);

    // Tab 1 loads
    mockedManager.getURL.mockReturnValue("https://a.com");
    mockedManager.getPageTitle.mockResolvedValue("Page A");
    mockedManager.getPageMetaDescription.mockResolvedValue("");
    service.onPageLoaded("tab-1");

    // Tab 2 loads
    mockedManager.getURL.mockReturnValue("https://b.com");
    mockedManager.getPageTitle.mockResolvedValue("Page B");
    mockedManager.getPageMetaDescription.mockResolvedValue("");
    service.onPageLoaded("tab-2");

    vi.advanceTimersByTime(2000);

    return vi.waitFor(() => {
      const calls = mockWindow.webContents.send.mock.calls;
      const tabIds = calls
        .filter((c: unknown[]) => c[0] === "augmented:related-items")
        .map((c: unknown[]) => (c[1] as { tabId: string }).tabId);
      expect(tabIds).toContain("tab-1");
      expect(tabIds).toContain("tab-2");
    });
  });
});
