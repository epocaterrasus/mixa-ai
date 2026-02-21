// @mixa-ai/content-processor — Code block extractor
// Detects and extracts code blocks with language detection from HTML

import { JSDOM } from "jsdom";

/** A code block extracted from an HTML page */
export interface CodeBlock {
  code: string;
  language: string | null;
  lineCount: number;
}

const LANGUAGE_CLASS_PATTERNS: readonly RegExp[] = [
  /^language-(.+)$/,
  /^lang-(.+)$/,
  /^highlight-source-(.+)$/,
  /^brush:\s*(.+?)(?:\s|;|$)/,
];

const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  yml: "yaml",
  md: "markdown",
  rs: "rust",
  cs: "csharp",
  cpp: "c++",
};

/**
 * Extract code blocks from HTML content.
 * Looks for `<pre><code>` patterns (most common) and standalone multi-line `<code>` blocks.
 * Detects programming language from CSS class names (language-xxx, lang-xxx, etc.).
 */
export function extractCodeBlocks(html: string): CodeBlock[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const blocks: CodeBlock[] = [];
  const seen = new Set<string>();

  // Find <pre> blocks (may contain <code> children)
  const preElements = doc.querySelectorAll("pre");
  for (const pre of preElements) {
    const codeEl = pre.querySelector("code");
    const targetEl = codeEl ?? pre;
    const code = targetEl.textContent?.trim() ?? "";
    if (!code || seen.has(code)) continue;
    seen.add(code);

    const language = detectLanguage(targetEl) ?? detectLanguage(pre);
    blocks.push({
      code,
      language,
      lineCount: code.split("\n").length,
    });
  }

  // Find standalone <code> blocks not inside <pre> (only if multi-line or substantial)
  const codeElements = doc.querySelectorAll("code");
  for (const codeEl of codeElements) {
    if (codeEl.closest("pre")) continue;
    const code = codeEl.textContent?.trim() ?? "";
    if (!code || seen.has(code)) continue;
    if (code.split("\n").length < 2 && code.length < 80) continue;
    seen.add(code);

    const language = detectLanguage(codeEl);
    blocks.push({
      code,
      language,
      lineCount: code.split("\n").length,
    });
  }

  return blocks;
}

function detectLanguage(element: Element): string | null {
  const classNames = element.className.split(/\s+/);

  for (const cls of classNames) {
    for (const pattern of LANGUAGE_CLASS_PATTERNS) {
      const match = cls.match(pattern);
      if (match?.[1]) {
        const lang = match[1].toLowerCase();
        return LANGUAGE_ALIASES[lang] ?? lang;
      }
    }
  }

  return null;
}
