// @mixa-ai/content-processor — HTML sanitizer
// Strips dangerous elements: scripts, iframes, tracking pixels, event handlers

import { JSDOM } from "jsdom";

const DANGEROUS_TAGS = [
  "script",
  "noscript",
  "style",
  "iframe",
  "object",
  "embed",
  "applet",
  "form",
  "link",
] as const;

const DANGEROUS_PROTOCOLS = ["javascript:", "vbscript:", "data:"] as const;

const EVENT_HANDLER_RE = /^on/i;

/**
 * Sanitize HTML by removing dangerous tags, event handlers,
 * tracking pixels, and javascript: URIs.
 */
export function sanitizeHtml(html: string): string {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Remove dangerous tags
  for (const tag of DANGEROUS_TAGS) {
    const elements = doc.querySelectorAll(tag);
    for (const el of elements) {
      el.remove();
    }
  }

  // Remove tracking pixels (1x1 or 0x0 images)
  const images = doc.querySelectorAll("img");
  for (const img of images) {
    const width = img.getAttribute("width");
    const height = img.getAttribute("height");
    if (
      (width === "1" || width === "0") &&
      (height === "1" || height === "0")
    ) {
      img.remove();
      continue;
    }

    // Remove images with dangerous src protocols
    const src = img.getAttribute("src") ?? "";
    if (hasDangerousProtocol(src)) {
      img.remove();
    }
  }

  // Remove event handlers and dangerous URI attributes from all elements
  const allElements = doc.querySelectorAll("*");
  for (const el of allElements) {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (EVENT_HANDLER_RE.test(attr.name)) {
        el.removeAttribute(attr.name);
      }

      if (
        ["href", "src", "action"].includes(attr.name) &&
        hasDangerousProtocol(attr.value)
      ) {
        el.removeAttribute(attr.name);
      }
    }
  }

  return doc.body.innerHTML;
}

function hasDangerousProtocol(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return DANGEROUS_PROTOCOLS.some((p) => trimmed.startsWith(p));
}
