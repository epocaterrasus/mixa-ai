import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitizer.js";
import { DANGEROUS_HTML } from "./__fixtures__/sample-article.js";

describe("sanitizeHtml", () => {
  it("removes script tags", () => {
    const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
    expect(result).not.toContain("<script");
    expect(result).toContain("<p>Hello</p>");
  });

  it("removes iframe tags", () => {
    const result = sanitizeHtml(
      '<p>Content</p><iframe src="https://evil.com"></iframe>',
    );
    expect(result).not.toContain("<iframe");
    expect(result).toContain("<p>Content</p>");
  });

  it("removes style tags", () => {
    const result = sanitizeHtml(
      "<p>Content</p><style>body { display: none; }</style>",
    );
    expect(result).not.toContain("<style");
  });

  it("removes object and embed tags", () => {
    const result = sanitizeHtml(
      '<p>Content</p><object data="bad.swf"></object><embed src="bad.swf">',
    );
    expect(result).not.toContain("<object");
    expect(result).not.toContain("<embed");
  });

  it("removes tracking pixels (1x1 images)", () => {
    const result = sanitizeHtml(
      '<img src="https://tracker.com/pixel.gif" width="1" height="1">',
    );
    expect(result).not.toContain("<img");
  });

  it("removes 0x0 tracking pixels", () => {
    const result = sanitizeHtml(
      '<img src="https://tracker.com/pixel.gif" width="0" height="0">',
    );
    expect(result).not.toContain("<img");
  });

  it("preserves normal images", () => {
    const result = sanitizeHtml(
      '<img src="https://example.com/photo.jpg" width="800" height="600">',
    );
    expect(result).toContain("<img");
    expect(result).toContain("photo.jpg");
  });

  it("removes images with javascript: src", () => {
    const result = sanitizeHtml(
      '<img src="javascript:alert(1)" alt="bad image">',
    );
    expect(result).not.toContain("javascript:");
  });

  it("removes event handler attributes", () => {
    const result = sanitizeHtml(
      '<p onclick="steal()" onmouseover="hack()">Text</p>',
    );
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onmouseover");
    expect(result).toContain("Text");
  });

  it("removes javascript: hrefs", () => {
    const result = sanitizeHtml('<a href="javascript:void(0)">Link</a>');
    expect(result).not.toContain("javascript:");
    expect(result).toContain("Link");
  });

  it("preserves safe content", () => {
    const result = sanitizeHtml(
      '<h1>Title</h1><p>Paragraph with <a href="https://example.com">link</a></p>',
    );
    expect(result).toContain("<h1>Title</h1>");
    expect(result).toContain("https://example.com");
  });

  it("handles the comprehensive dangerous HTML fixture", () => {
    const result = sanitizeHtml(DANGEROUS_HTML);
    expect(result).toContain("Safe content here.");
    expect(result).toContain("More safe content.");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("<iframe");
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onmouseover");
    expect(result).not.toContain("<object");
    expect(result).not.toContain("<embed");
    expect(result).not.toContain("<style");
    // Tracking pixel should be removed
    expect(result).not.toContain("pixel.gif");
  });

  it("handles empty HTML", () => {
    const result = sanitizeHtml("");
    expect(result).toBe("");
  });
});
