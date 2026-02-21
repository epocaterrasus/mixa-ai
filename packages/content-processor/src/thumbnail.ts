// @mixa-ai/content-processor — Thumbnail URL extractor
// Extracts thumbnail/preview images from page metadata (og:image, twitter:image, etc.)

import { JSDOM } from "jsdom";

/** Result of thumbnail extraction from page metadata */
export interface ThumbnailResult {
  url: string;
  width: number | null;
  height: number | null;
}

/**
 * Extract a thumbnail image URL from HTML page metadata.
 * Checks og:image, twitter:image, and link[rel="image_src"] in priority order.
 */
export function extractThumbnail(
  html: string,
  baseUrl?: string,
): ThumbnailResult | null {
  const dom = new JSDOM(html, { url: baseUrl });
  const doc = dom.window.document;

  // 1. og:image (highest priority)
  const ogImage = doc.querySelector('meta[property="og:image"]');
  if (ogImage) {
    const content = ogImage.getAttribute("content");
    if (content) {
      const ogWidth = doc
        .querySelector('meta[property="og:image:width"]')
        ?.getAttribute("content");
      const ogHeight = doc
        .querySelector('meta[property="og:image:height"]')
        ?.getAttribute("content");
      return {
        url: resolveUrl(content, baseUrl),
        width: ogWidth ? parseInt(ogWidth, 10) : null,
        height: ogHeight ? parseInt(ogHeight, 10) : null,
      };
    }
  }

  // 2. twitter:image
  const twitterImage =
    doc.querySelector('meta[name="twitter:image"]') ??
    doc.querySelector('meta[property="twitter:image"]');
  if (twitterImage) {
    const content = twitterImage.getAttribute("content");
    if (content) {
      return {
        url: resolveUrl(content, baseUrl),
        width: null,
        height: null,
      };
    }
  }

  // 3. link[rel="image_src"]
  const linkImage = doc.querySelector('link[rel="image_src"]');
  if (linkImage) {
    const href = linkImage.getAttribute("href");
    if (href) {
      return {
        url: resolveUrl(href, baseUrl),
        width: null,
        height: null,
      };
    }
  }

  return null;
}

function resolveUrl(url: string, baseUrl?: string): string {
  if (!baseUrl) return url;
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}
