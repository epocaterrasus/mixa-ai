// @mixa-ai/content-processor — Article extractor using Mozilla Readability

import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { sanitizeHtml } from "../sanitizer.js";

/** Result of extracting an article from a web page */
export interface ArticleResult {
  title: string;
  author: string | null;
  content: string;
  textContent: string;
  excerpt: string | null;
  siteName: string | null;
  wordCount: number;
  readingTime: number;
}

const WORDS_PER_MINUTE = 200;

/**
 * Extract article content from an HTML page using Mozilla's Readability algorithm.
 * Returns structured article data with sanitized HTML content, or null if
 * the page doesn't contain recognizable article content.
 */
export function extractArticle(
  html: string,
  url?: string,
): ArticleResult | null {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) return null;

  const sanitizedContent = sanitizeHtml(article.content);
  const textContent = article.textContent.trim();
  const wordCount = countWords(textContent);
  const readingTime = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

  return {
    title: article.title,
    author: article.byline ?? null,
    content: sanitizedContent,
    textContent,
    excerpt: article.excerpt ?? null,
    siteName: article.siteName ?? null,
    wordCount,
    readingTime,
  };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}
