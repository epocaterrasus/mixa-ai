import { describe, it, expect } from "vitest";
import { extractCodeBlocks } from "./code.js";
import {
  CODE_BLOCKS_HTML,
  PRE_WITHOUT_CODE_HTML,
  HIGHLIGHT_SOURCE_HTML,
  NO_CODE_HTML,
  DUPLICATE_CODE_HTML,
} from "../__fixtures__/sample-code.js";

describe("extractCodeBlocks", () => {
  it("extracts multiple code blocks with language detection", () => {
    const blocks = extractCodeBlocks(CODE_BLOCKS_HTML);
    // Should find: JS, Python, Rust, no-lang pre/code, and long inline code
    expect(blocks.length).toBeGreaterThanOrEqual(4);
  });

  it("detects language-xxx class pattern", () => {
    const blocks = extractCodeBlocks(CODE_BLOCKS_HTML);
    const jsBlock = blocks.find((b) => b.language === "javascript");
    expect(jsBlock).toBeDefined();
    expect(jsBlock?.code).toContain("function greet");
  });

  it("detects lang-xxx class pattern and resolves aliases", () => {
    const blocks = extractCodeBlocks(CODE_BLOCKS_HTML);
    // lang-py should resolve to "python"
    const pyBlock = blocks.find((b) => b.language === "python");
    expect(pyBlock).toBeDefined();
    expect(pyBlock?.code).toContain("def fibonacci");
  });

  it("resolves language aliases (rs → rust)", () => {
    const blocks = extractCodeBlocks(CODE_BLOCKS_HTML);
    const rustBlock = blocks.find((b) => b.language === "rust");
    expect(rustBlock).toBeDefined();
    expect(rustBlock?.code).toContain("fn main");
  });

  it("handles code blocks without language class", () => {
    const blocks = extractCodeBlocks(CODE_BLOCKS_HTML);
    const noLangBlock = blocks.find(
      (b) => b.language === null && b.code.includes("generic code block"),
    );
    expect(noLangBlock).toBeDefined();
    expect(noLangBlock?.lineCount).toBeGreaterThanOrEqual(3);
  });

  it("skips short inline code elements", () => {
    const html =
      "<p>Use <code>npm install</code> to install packages.</p>";
    const blocks = extractCodeBlocks(html);
    expect(blocks).toHaveLength(0);
  });

  it("extracts long standalone code elements", () => {
    const blocks = extractCodeBlocks(CODE_BLOCKS_HTML);
    const standaloneBlock = blocks.find(
      (b) =>
        b.code.includes("long standalone code block") && b.lineCount >= 2,
    );
    expect(standaloneBlock).toBeDefined();
  });

  it("handles pre tags without code children", () => {
    const blocks = extractCodeBlocks(PRE_WITHOUT_CODE_HTML);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    const bashBlock = blocks.find((b) => b.language === "bash");
    expect(bashBlock).toBeDefined();
    expect(bashBlock?.code).toContain("echo");
  });

  it("handles highlight-source-xxx pattern", () => {
    const blocks = extractCodeBlocks(HIGHLIGHT_SOURCE_HTML);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.language).toBe("go");
    expect(blocks[0]?.code).toContain("fmt.Println");
  });

  it("returns empty array for pages with no code", () => {
    const blocks = extractCodeBlocks(NO_CODE_HTML);
    expect(blocks).toHaveLength(0);
  });

  it("deduplicates identical code blocks", () => {
    const blocks = extractCodeBlocks(DUPLICATE_CODE_HTML);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.code).toContain("duplicate");
  });

  it("counts lines correctly", () => {
    const html = `<pre><code>line 1
line 2
line 3
line 4</code></pre>`;
    const blocks = extractCodeBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.lineCount).toBe(4);
  });
});
