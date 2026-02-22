import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { BrowserWindow } from "electron";

vi.mock("../tabs/manager.js", () => ({
  tabManager: {
    getURL: vi.fn(),
    getPageTitle: vi.fn(),
    getPageMetaDescription: vi.fn(),
    getPageHTML: vi.fn(),
  },
}));

const mockItems: Array<Record<string, unknown>> = [];
const mockSelectRows = vi.fn(() => [...mockItems]);

vi.mock("../db/index.js", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: mockSelectRows,
      }),
    }),
  }),
  getUserId: () => "user-001",
}));

vi.mock("@mixa-ai/db", () => ({
  items: { userId: "user_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "eq-filter"),
}));

import {
  findRelatedItems,
  AugmentedBrowsingService,
  type PageContext,
} from "./service.js";
import { tabManager } from "../tabs/manager.js";

function clearStore(): void {
  mockItems.length = 0;
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
  const now = new Date();
  mockItems.push({
    id: overrides.id,
    userId: "user-001",
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

function ctx(url: string, title: string, description: string = ""): PageContext {
  return { url, title, description };
}

describe("findRelatedItems", () => {
  beforeEach(() => {
    clearStore();
  });

  it("returns empty array when no items in store", async () => {
    mockSelectRows.mockResolvedValue([]);
    const result = await findRelatedItems(ctx("https://example.com", "Test Page"));
    expect(result).toEqual([]);
  });

  it("returns exact URL match with score 1.0", async () => {
    makeCapturedItem({
      id: "item-1",
      title: "Saved Article",
      url: "https://example.com/article",
      domain: "example.com",
    });
    mockSelectRows.mockResolvedValue([...mockItems]);

    const result = await findRelatedItems(
      ctx("https://example.com/article", "Some Page"),
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("item-1");
    expect(result[0]?.score).toBe(1.0);
  });

  it("scores same-domain items higher", async () => {
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
    mockSelectRows.mockResolvedValue([...mockItems]);

    const result = await findRelatedItems(
      ctx("https://example.com/page", "Unrelated Title"),
    );

    const sameDomain = result.find((r) => r.id === "same-domain");
    const diffDomain = result.find((r) => r.id === "diff-domain");

    expect(sameDomain).toBeDefined();
    if (diffDomain) {
      expect(sameDomain!.score).toBeGreaterThan(diffDomain.score);
    }
  });

  it("scores title word overlap", async () => {
    makeCapturedItem({
      id: "title-match",
      title: "Building React Components with TypeScript",
      url: "https://blog.com/react-ts",
      domain: "blog.com",
    });
    mockSelectRows.mockResolvedValue([...mockItems]);

    const result = await findRelatedItems(
      ctx("https://other.com/tutorial", "React Components Tutorial"),
      10,
      0.1,
    );

    const match = result.find((r) => r.id === "title-match");
    expect(match).toBeDefined();
    expect(match!.score).toBeGreaterThan(0);
  });

  it("filters items below minScore", async () => {
    makeCapturedItem({
      id: "low-rel",
      title: "Completely unrelated topic about cooking",
      url: "https://cooking.com/recipe",
      domain: "cooking.com",
    });
    mockSelectRows.mockResolvedValue([...mockItems]);

    const result = await findRelatedItems(
      ctx("https://dev.to/article", "Advanced Kubernetes Deployment Strategies"),
      10,
      0.2,
    );

    expect(result).toHaveLength(0);
  });

  it("limits results to specified count", async () => {
    for (let i = 0; i < 20; i++) {
      makeCapturedItem({
        id: `item-${i}`,
        title: `Test Article ${i}`,
        url: `https://example.com/article-${i}`,
        domain: "example.com",
      });
    }
    mockSelectRows.mockResolvedValue([...mockItems]);

    const result = await findRelatedItems(
      ctx("https://example.com/new-page", "Test Article"),
      5,
    );

    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("caps non-exact-match scores below 1.0", async () => {
    makeCapturedItem({
      id: "high-rel",
      title: "Same exact title here",
      url: "https://example.com/different-url",
      domain: "example.com",
      contentText: "This article discusses same exact title here extensively",
    });
    mockSelectRows.mockResolvedValue([...mockItems]);

    const result = await findRelatedItems(
      ctx("https://example.com/page", "Same exact title here"),
    );

    const match = result.find((r) => r.id === "high-rel");
    expect(match).toBeDefined();
    expect(match!.score).toBeLessThan(1.0);
  });

  it("returns correct RelatedItem shape", async () => {
    makeCapturedItem({
      id: "shape-test",
      title: "Shape Test Article",
      url: "https://example.com/shape",
      domain: "example.com",
      description: "A test summary",
      faviconUrl: "https://example.com/favicon.ico",
      itemType: "article",
    });
    mockSelectRows.mockResolvedValue([...mockItems]);

    const result = await findRelatedItems(
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
    mockSelectRows.mockResolvedValue([]);

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

    expect(mockWindow.webContents.send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);

    return vi.waitFor(() => {
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        "augmented:related-items",
        expect.objectContaining({ tabId: "tab-1" }),
      );
    });
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

  it("does not check when disabled", () => {
    service.setEnabled(false);
    service.onPageLoaded("tab-1");
    vi.advanceTimersByTime(5000);

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
});
