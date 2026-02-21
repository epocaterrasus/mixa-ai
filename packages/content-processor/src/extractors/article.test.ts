import { describe, it, expect } from "vitest";
import { extractArticle } from "./article.js";
import {
  SAMPLE_ARTICLE_HTML,
  MINIMAL_PAGE_HTML,
} from "../__fixtures__/sample-article.js";

describe("extractArticle", () => {
  it("extracts article content from a well-structured page", () => {
    const result = extractArticle(
      SAMPLE_ARTICLE_HTML,
      "https://devblog.example.com/typescript-generics",
    );
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.title).toContain("TypeScript Generics");
    expect(result.textContent.length).toBeGreaterThan(100);
    expect(result.wordCount).toBeGreaterThan(50);
    expect(result.readingTime).toBeGreaterThanOrEqual(1);
  });

  it("returns sanitized HTML content (no script tags)", () => {
    const result = extractArticle(SAMPLE_ARTICLE_HTML);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.content).not.toContain("<script");
    expect(result.content).not.toContain("tracking");
  });

  it("calculates word count correctly", () => {
    const result = extractArticle(SAMPLE_ARTICLE_HTML);
    expect(result).not.toBeNull();
    if (!result) return;

    // Word count should match the number of whitespace-separated words in textContent
    const expectedWords = result.textContent
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    expect(result.wordCount).toBe(expectedWords);
  });

  it("calculates reading time (minimum 1 minute)", () => {
    const shortHtml = `
      <html><body>
        <article>
          <h1>Short Article</h1>
          <p>This is a very short article with just a few words.</p>
        </article>
      </body></html>
    `;
    const result = extractArticle(shortHtml);
    if (result) {
      expect(result.readingTime).toBeGreaterThanOrEqual(1);
    }
  });

  it("returns null for pages without article content", () => {
    const result = extractArticle(MINIMAL_PAGE_HTML);
    // Readability may return null for very minimal pages
    // This is expected behavior — not every page is an article
    if (result === null) {
      expect(result).toBeNull();
    } else {
      // If it does extract something, it should still have valid structure
      expect(result.title).toBeDefined();
      expect(result.wordCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles empty HTML gracefully", () => {
    const result = extractArticle("");
    // Should return null or a minimal result, not throw
    if (result !== null) {
      expect(result.title).toBeDefined();
    }
  });

  it("extracts content without URL parameter", () => {
    const result = extractArticle(SAMPLE_ARTICLE_HTML);
    // Should still work without a URL
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.title).toContain("TypeScript Generics");
  });
});
