import { describe, it, expect } from "vitest";
import { extractThumbnail } from "./thumbnail.js";
import {
  THUMBNAIL_HTML,
  TWITTER_IMAGE_HTML,
  LINK_IMAGE_HTML,
  NO_THUMBNAIL_HTML,
} from "./__fixtures__/sample-article.js";

describe("extractThumbnail", () => {
  it("extracts og:image with dimensions", () => {
    const result = extractThumbnail(
      THUMBNAIL_HTML,
      "https://example.com/page",
    );
    expect(result).not.toBeNull();
    expect(result?.url).toBe("https://example.com/images/hero.png");
    expect(result?.width).toBe(800);
    expect(result?.height).toBe(400);
  });

  it("resolves relative og:image URLs against base URL", () => {
    const html = `<html><head><meta property="og:image" content="/img/test.png"></head><body></body></html>`;
    const result = extractThumbnail(html, "https://blog.example.com/article");
    expect(result?.url).toBe("https://blog.example.com/img/test.png");
  });

  it("extracts twitter:image when no og:image", () => {
    const result = extractThumbnail(TWITTER_IMAGE_HTML);
    expect(result).not.toBeNull();
    expect(result?.url).toBe("https://cdn.example.com/card.jpg");
    expect(result?.width).toBeNull();
    expect(result?.height).toBeNull();
  });

  it("extracts link[rel=image_src] as fallback", () => {
    const result = extractThumbnail(
      LINK_IMAGE_HTML,
      "https://example.com/page",
    );
    expect(result).not.toBeNull();
    expect(result?.url).toBe("https://example.com/static/preview.png");
  });

  it("returns null when no thumbnail metadata exists", () => {
    const result = extractThumbnail(NO_THUMBNAIL_HTML);
    expect(result).toBeNull();
  });

  it("prefers og:image over twitter:image", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="https://example.com/og.png">
        <meta name="twitter:image" content="https://example.com/twitter.png">
      </head><body></body></html>
    `;
    const result = extractThumbnail(html);
    expect(result?.url).toBe("https://example.com/og.png");
  });

  it("handles absolute URLs without base URL", () => {
    const html = `<html><head><meta property="og:image" content="https://cdn.example.com/img.jpg"></head><body></body></html>`;
    const result = extractThumbnail(html);
    expect(result?.url).toBe("https://cdn.example.com/img.jpg");
  });
});
