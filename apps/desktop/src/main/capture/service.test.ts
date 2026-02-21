import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the tabManager before importing the service
vi.mock("../tabs/manager.js", () => ({
  tabManager: {
    getURL: vi.fn(),
    getPageHTML: vi.fn(),
    getSelectedText: vi.fn(),
  },
}));

// Mock crypto.randomUUID for deterministic tests
vi.mock("node:crypto", () => ({
  randomUUID: vi.fn(() => "00000000-0000-0000-0000-000000000001"),
}));

import { captureTab, captureSelection, captureStore } from "./service.js";
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

describe("CaptureStore", () => {
  beforeEach(() => {
    // Reset the store between tests by deleting all items
    for (const item of captureStore.getAll()) {
      captureStore.delete(item.id);
    }
  });

  it("stores and retrieves items", () => {
    const now = new Date().toISOString();
    captureStore.add({
      id: "test-1",
      url: "https://example.com",
      title: "Test",
      description: null,
      contentText: "Hello",
      contentHtml: "<p>Hello</p>",
      itemType: "article",
      sourceType: "manual",
      thumbnailUrl: null,
      faviconUrl: null,
      domain: "example.com",
      wordCount: 1,
      readingTime: 1,
      isArchived: false,
      isFavorite: false,
      capturedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    expect(captureStore.count()).toBe(1);
    expect(captureStore.getById("test-1")?.title).toBe("Test");
  });

  it("finds items by URL", () => {
    const now = new Date().toISOString();
    captureStore.add({
      id: "test-url",
      url: "https://example.com/article",
      title: "URL Test",
      description: null,
      contentText: null,
      contentHtml: null,
      itemType: "article",
      sourceType: "manual",
      thumbnailUrl: null,
      faviconUrl: null,
      domain: "example.com",
      wordCount: null,
      readingTime: null,
      isArchived: false,
      isFavorite: false,
      capturedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const found = captureStore.findByUrl("https://example.com/article");
    expect(found).toBeDefined();
    expect(found?.title).toBe("URL Test");

    const notFound = captureStore.findByUrl("https://other.com");
    expect(notFound).toBeUndefined();
  });

  it("updates items", () => {
    const now = new Date().toISOString();
    captureStore.add({
      id: "test-update",
      url: null,
      title: "Original",
      description: null,
      contentText: null,
      contentHtml: null,
      itemType: "article",
      sourceType: "manual",
      thumbnailUrl: null,
      faviconUrl: null,
      domain: null,
      wordCount: null,
      readingTime: null,
      isArchived: false,
      isFavorite: false,
      capturedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const updated = captureStore.update("test-update", { title: "Updated" });
    expect(updated?.title).toBe("Updated");
    expect(captureStore.getById("test-update")?.title).toBe("Updated");
  });

  it("deletes items", () => {
    const now = new Date().toISOString();
    captureStore.add({
      id: "test-delete",
      url: null,
      title: "Delete Me",
      description: null,
      contentText: null,
      contentHtml: null,
      itemType: "article",
      sourceType: "manual",
      thumbnailUrl: null,
      faviconUrl: null,
      domain: null,
      wordCount: null,
      readingTime: null,
      isArchived: false,
      isFavorite: false,
      capturedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    expect(captureStore.delete("test-delete")).toBe(true);
    expect(captureStore.getById("test-delete")).toBeUndefined();
    expect(captureStore.delete("nonexistent")).toBe(false);
  });
});

describe("captureTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const item of captureStore.getAll()) {
      captureStore.delete(item.id);
    }
  });

  it("captures a web page with article extraction", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com/article");
    mockedManager.getPageHTML.mockResolvedValue(SAMPLE_HTML);

    const result = await captureTab("tab-1");

    expect(result.id).toBeDefined();
    expect(result.url).toBe("https://example.com/article");
    expect(result.itemType).toBe("article");
    expect(result.domain).toBe("example.com");

    // Verify stored in capture store
    expect(captureStore.count()).toBe(1);
    const stored = captureStore.getById(result.id);
    expect(stored).toBeDefined();
    expect(stored?.contentHtml).toBeDefined();
    expect(stored?.contentHtml).not.toContain("<script");
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

  it("handles duplicate URLs by updating", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com/dupe");
    mockedManager.getPageHTML.mockResolvedValue(SAMPLE_HTML);

    const first = await captureTab("tab-1");
    expect(captureStore.count()).toBe(1);

    // Capture same URL again
    const second = await captureTab("tab-1");
    expect(captureStore.count()).toBe(1); // Still 1 item
    expect(second.id).toBe(first.id); // Same ID
  });

  it("fails gracefully when HTML extraction fails", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com/fail");
    mockedManager.getPageHTML.mockResolvedValue(null);

    await expect(captureTab("tab-1")).rejects.toThrow("failed to extract");
  });

  it("extracts thumbnail from og:image", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com/with-thumb");
    mockedManager.getPageHTML.mockResolvedValue(SAMPLE_HTML);

    const result = await captureTab("tab-1");
    const stored = captureStore.getById(result.id);
    expect(stored?.thumbnailUrl).toBe("https://example.com/thumb.jpg");
  });
});

describe("captureSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const item of captureStore.getAll()) {
      captureStore.delete(item.id);
    }
  });

  it("captures selected text as a highlight", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com/page");

    const result = await captureSelection(
      "tab-1",
      "This is selected text that should be captured as a highlight.",
    );

    expect(result.itemType).toBe("highlight");
    expect(result.domain).toBe("example.com");
    expect(result.wordCount).toBe(11);

    const stored = captureStore.getById(result.id);
    expect(stored).toBeDefined();
    expect(stored?.contentText).toBe(
      "This is selected text that should be captured as a highlight.",
    );
    expect(stored?.sourceType).toBe("manual");
  });

  it("truncates long selections in title", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com/page");

    const longText = "A".repeat(200);
    const result = await captureSelection("tab-1", longText);

    const stored = captureStore.getById(result.id);
    expect(stored?.title.length).toBeLessThanOrEqual(104); // 100 + "..."
  });

  it("handles missing URL gracefully", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue(null);

    const result = await captureSelection("tab-1", "Some text");
    expect(result.url).toBeNull();
    expect(result.domain).toBeNull();
  });

  it("sanitizes HTML in selection content", async () => {
    const mockedManager = vi.mocked(tabManager);
    mockedManager.getURL.mockReturnValue("https://example.com");

    const result = await captureSelection("tab-1", "Safe text");
    const stored = captureStore.getById(result.id);

    // The content should be wrapped in blockquote and sanitized
    expect(stored?.contentHtml).toContain("blockquote");
    expect(stored?.contentHtml).not.toContain("<script");
  });
});
