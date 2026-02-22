import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../tabs/manager.js", () => ({
  tabManager: {
    getURL: vi.fn(),
    getPageHTML: vi.fn(),
    getSelectedText: vi.fn(),
  },
}));

const mockDbInsert = vi.fn();
const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();

vi.mock("../db/index.js", () => ({
  getDb: () => ({
    insert: () => ({
      values: () => ({
        returning: mockDbInsert,
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockDbSelect,
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: mockDbUpdate,
      }),
    }),
  }),
  getUserId: () => "user-001",
}));

vi.mock("@mixa-ai/db", () => ({
  items: {
    id: "id",
    url: "url",
    userId: "user_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => "eq-filter"),
}));

import { captureTab, captureSelection } from "./service.js";
import { tabManager } from "../tabs/manager.js";

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Article</title>
  <meta property="og:image" content="https://example.com/thumb.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
</head>
<body>
  <article>
    <h1>Test Article Title</h1>
    <p>By John Doe</p>
    <p>This is a test article with enough content to be recognized by Readability.
    It needs to have multiple paragraphs and a good amount of text content to pass
    the content detection heuristics used by the Mozilla Readability algorithm.</p>
    <p>Here is another paragraph with more content. The quick brown fox jumps over
    the lazy dog. This is repeated content to make the article long enough to be
    detected as a proper article by the Readability parser.</p>
    <p>And a third paragraph to really make sure. This article discusses important
    topics that are relevant to the reader. It provides valuable information that
    should be saved for future reference.</p>
    <p>The fourth paragraph adds even more substance. When building developer tools,
    it is important to think about the user experience and make sure that content
    capture works reliably across different types of web pages.</p>
    <p>Finally, a conclusion paragraph. The article wraps up by summarizing the key
    points and providing actionable takeaways for the reader.</p>
  </article>
</body>
</html>
`;

describe("captureTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbSelect.mockResolvedValue([]);
    mockDbInsert.mockResolvedValue([{
      id: "new-item-id",
      title: "Test Article Title",
      url: "https://example.com/article",
      domain: "example.com",
      wordCount: 100,
      readingTime: 1,
      description: null,
      contentText: null,
      contentHtml: null,
      itemType: "article",
      sourceType: "manual",
      thumbnailUrl: null,
      faviconUrl: null,
      summary: null,
      isArchived: false,
      isFavorite: false,
      capturedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
  });

  it("captures a web page successfully", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com/article");
    mockedManager.getPageHTML.mockResolvedValue(SAMPLE_HTML);

    const result = await captureTab("tab-1");

    expect(result.id).toBe("new-item-id");
    expect(result.url).toBe("https://example.com/article");
    expect(result.itemType).toBe("article");
    expect(result.domain).toBe("example.com");
  });

  it("rejects restricted URLs", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("chrome://settings");

    await expect(captureTab("tab-1")).rejects.toThrow("restricted page");
  });

  it("rejects about: URLs", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("about:blank");

    await expect(captureTab("tab-1")).rejects.toThrow("restricted page");
  });

  it("rejects tabs with no URL", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue(null);

    await expect(captureTab("tab-1")).rejects.toThrow("no URL");
  });

  it("handles duplicate URLs by updating existing item", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com/dupe");
    mockedManager.getPageHTML.mockResolvedValue(SAMPLE_HTML);

    mockDbSelect.mockResolvedValue([{
      id: "existing-id",
      title: "Existing",
      url: "https://example.com/dupe",
      domain: "example.com",
      wordCount: 50,
      readingTime: 1,
      description: null,
      contentText: null,
      contentHtml: null,
      thumbnailUrl: null,
      faviconUrl: null,
    }]);

    const result = await captureTab("tab-1");
    expect(result.id).toBe("existing-id");
    expect(mockDbUpdate).toHaveBeenCalled();
  });

  it("fails gracefully when HTML extraction fails", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com/fail");
    mockedManager.getPageHTML.mockResolvedValue(null);

    await expect(captureTab("tab-1")).rejects.toThrow("failed to extract");
  });
});

describe("captureSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbInsert.mockResolvedValue([{
      id: "sel-item-id",
      title: "Selected text...",
      url: "https://example.com/page",
      domain: "example.com",
      wordCount: 5,
      readingTime: 1,
      description: null,
      contentText: "Selected text here",
      contentHtml: "<blockquote>Selected text here</blockquote>",
      itemType: "highlight",
      sourceType: "manual",
      thumbnailUrl: null,
      faviconUrl: null,
      summary: null,
      isArchived: false,
      isFavorite: false,
      capturedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
  });

  it("captures selected text as a highlight", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com/page");

    const result = await captureSelection(
      "tab-1",
      "This is selected text that should be captured.",
    );

    expect(result.itemType).toBe("highlight");
    expect(result.domain).toBe("example.com");
  });

  it("handles missing URL gracefully", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue(null);

    mockDbInsert.mockResolvedValue([{
      id: "no-url-id",
      title: "Some text",
      url: null,
      domain: null,
      wordCount: 2,
      readingTime: 1,
      description: null,
      contentText: "Some text",
      contentHtml: "<blockquote>Some text</blockquote>",
      itemType: "highlight",
      sourceType: "manual",
      thumbnailUrl: null,
      faviconUrl: null,
      summary: null,
      isArchived: false,
      isFavorite: false,
      capturedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);

    const result = await captureSelection("tab-1", "Some text");
    expect(result.url).toBeNull();
    expect(result.domain).toBeNull();
  });
});
