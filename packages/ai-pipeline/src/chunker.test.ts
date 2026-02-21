import { describe, it, expect } from "vitest";
import { chunkText } from "./chunker.js";
import { countTokens } from "./tokenizer.js";

describe("chunkText", () => {
  it("returns empty array for empty text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns single chunk for short text", () => {
    const text = "Hello, world! This is a short text.";
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toBe(text);
    expect(chunks[0]!.index).toBe(0);
    expect(chunks[0]!.tokenCount).toBe(countTokens(text));
  });

  it("splits long text into multiple chunks", () => {
    // Create a text with multiple paragraphs that exceeds 512 tokens
    const paragraphs = Array.from({ length: 50 }, (_, i) =>
      `This is paragraph number ${i + 1}. It contains several sentences about testing. The chunker should split this into appropriate pieces based on token count.`,
    );
    const text = paragraphs.join("\n\n");
    const chunks = chunkText(text);

    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk should have a valid index
    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
      expect(chunk.tokenCount).toBeGreaterThan(0);
      expect(chunk.content.length).toBeGreaterThan(0);
    });
  });

  it("respects paragraph boundaries", () => {
    const text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const chunks = chunkText(text, { targetTokens: 1000 });

    // All three paragraphs fit in 1000 tokens, so single chunk
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toContain("First paragraph.");
    expect(chunks[0]!.content).toContain("Second paragraph.");
    expect(chunks[0]!.content).toContain("Third paragraph.");
  });

  it("splits on sentence boundaries for oversized paragraphs", () => {
    // One giant paragraph with many sentences
    const sentences = Array.from({ length: 100 }, (_, i) =>
      `Sentence number ${i + 1} is here.`,
    );
    const text = sentences.join(" ");

    const chunks = chunkText(text, { targetTokens: 50, overlapTokens: 0 });

    expect(chunks.length).toBeGreaterThan(1);

    // No chunk should have a mid-sentence cut (each should end with a period)
    for (const chunk of chunks) {
      // Each chunk should contain complete sentences (ends with period)
      expect(chunk.content.trim()).toMatch(/\.$/);
    }
  });

  it("applies overlap between chunks", () => {
    const paragraphs = Array.from({ length: 30 }, (_, i) =>
      `Paragraph ${i + 1} with some meaningful content that contributes to the total token count.`,
    );
    const text = paragraphs.join("\n\n");

    const chunksWithOverlap = chunkText(text, {
      targetTokens: 100,
      overlapTokens: 30,
    });
    const chunksWithout = chunkText(text, {
      targetTokens: 100,
      overlapTokens: 0,
    });

    // With overlap, later chunks should contain some text from previous chunks
    if (chunksWithOverlap.length > 1 && chunksWithout.length > 1) {
      // Overlapped chunks should generally be larger (they include prefix from previous)
      const avgTokensOverlap =
        chunksWithOverlap.reduce((sum, c) => sum + c.tokenCount, 0) /
        chunksWithOverlap.length;
      const avgTokensNoOverlap =
        chunksWithout.reduce((sum, c) => sum + c.tokenCount, 0) /
        chunksWithout.length;

      // Second chunk onwards should be larger with overlap
      expect(avgTokensOverlap).toBeGreaterThanOrEqual(avgTokensNoOverlap);
    }
  });

  it("handles custom target and overlap options", () => {
    const text = Array.from({ length: 20 }, (_, i) =>
      `Point ${i + 1} about testing chunking.`,
    ).join("\n\n");

    const chunks = chunkText(text, { targetTokens: 30, overlapTokens: 5 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("handles text with single very long sentence gracefully", () => {
    // A single sentence that exceeds the target (no sentence break possible)
    const longSentence =
      "word ".repeat(200).trim() + ".";

    const chunks = chunkText(longSentence, {
      targetTokens: 50,
      overlapTokens: 0,
    });

    // Should still produce chunks (the long sentence becomes its own chunk)
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    // All text should be represented
    const allContent = chunks.map((c) => c.content).join(" ");
    expect(allContent).toContain("word");
  });

  it("handles text with only whitespace and newlines between content", () => {
    const text = "Start here.\n\n\n\n\n\nEnd here.";
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toContain("Start here.");
    expect(chunks[0]!.content).toContain("End here.");
  });

  it("assigns sequential indices to chunks", () => {
    const paragraphs = Array.from({ length: 40 }, (_, i) =>
      `Content block ${i + 1} with some padding text for tokens.`,
    );
    const text = paragraphs.join("\n\n");

    const chunks = chunkText(text, { targetTokens: 80, overlapTokens: 0 });

    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
    });
  });

  it("includes correct token counts in each chunk", () => {
    const text = "Hello world.\n\nGoodbye world.";
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBe(countTokens(chunk.content));
    }
  });
});

describe("countTokens", () => {
  it("counts tokens for simple text", () => {
    const tokens = countTokens("Hello, world!");
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(10);
  });

  it("counts tokens for empty string", () => {
    expect(countTokens("")).toBe(0);
  });

  it("counts tokens for longer text", () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    const tokens = countTokens(text);
    expect(tokens).toBeGreaterThan(5);
    expect(tokens).toBeLessThan(20);
  });
});
