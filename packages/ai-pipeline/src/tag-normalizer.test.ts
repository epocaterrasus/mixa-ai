import { describe, it, expect } from "vitest";
import {
  normalizeTagName,
  normalizeTags,
  deduplicateTags,
  type NormalizedTag,
} from "./tag-normalizer.js";

describe("normalizeTagName", () => {
  it("lowercases and trims", () => {
    expect(normalizeTagName("  Machine Learning  ")).toBe("machine-learning");
  });

  it("replaces spaces with hyphens", () => {
    expect(normalizeTagName("web development")).toBe("web-development");
  });

  it("removes special characters", () => {
    expect(normalizeTagName("C++ Programming!")).toBe("c-programming");
  });

  it("collapses multiple separators", () => {
    expect(normalizeTagName("data   science")).toBe("data-science");
    expect(normalizeTagName("data---science")).toBe("data-science");
    expect(normalizeTagName("data - science")).toBe("data-science");
  });

  it("removes leading/trailing hyphens", () => {
    expect(normalizeTagName("-typescript-")).toBe("typescript");
  });

  it("handles empty string", () => {
    expect(normalizeTagName("")).toBe("");
    expect(normalizeTagName("   ")).toBe("");
  });

  it("preserves numbers", () => {
    expect(normalizeTagName("web3")).toBe("web3");
    expect(normalizeTagName("React 19")).toBe("react-19");
  });
});

describe("deduplicateTags", () => {
  it("removes exact duplicates keeping higher score", () => {
    const tags: NormalizedTag[] = [
      { name: "typescript", score: 0.8 },
      { name: "typescript", score: 0.9 },
    ];
    const result = deduplicateTags(tags);
    expect(result).toHaveLength(1);
    expect(result[0]!.score).toBe(0.9);
  });

  it("merges similar tags above threshold", () => {
    const tags: NormalizedTag[] = [
      { name: "machine-learning", score: 0.9 },
      { name: "machine-learn", score: 0.7 },
    ];
    const result = deduplicateTags(tags, 0.7);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("machine-learning");
    expect(result[0]!.score).toBe(0.9);
  });

  it("keeps distinct tags separate", () => {
    const tags: NormalizedTag[] = [
      { name: "typescript", score: 0.9 },
      { name: "python", score: 0.8 },
      { name: "rust", score: 0.7 },
    ];
    const result = deduplicateTags(tags);
    expect(result).toHaveLength(3);
  });

  it("handles empty array", () => {
    expect(deduplicateTags([])).toEqual([]);
  });

  it("handles single tag", () => {
    const tags: NormalizedTag[] = [{ name: "ai", score: 0.95 }];
    const result = deduplicateTags(tags);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "ai", score: 0.95 });
  });
});

describe("normalizeTags", () => {
  it("normalizes, deduplicates, sorts, and limits tags", () => {
    const rawTags = [
      { name: "Machine Learning", score: 0.9 },
      { name: "AI", score: 0.95 },
      { name: "Deep Learning", score: 0.85 },
      { name: "Python", score: 0.7 },
      { name: "TensorFlow", score: 0.6 },
    ];

    const result = normalizeTags(rawTags);

    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(7);

    // Should be sorted by score descending
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.score).toBeLessThanOrEqual(result[i - 1]!.score);
    }

    // All names should be normalized
    for (const tag of result) {
      expect(tag.name).toBe(tag.name.toLowerCase());
      expect(tag.name).not.toMatch(/\s/);
    }
  });

  it("respects maxTags option", () => {
    const rawTags = Array.from({ length: 10 }, (_, i) => ({
      name: `tag-${i}`,
      score: 0.9 - i * 0.05,
    }));

    const result = normalizeTags(rawTags, { maxTags: 5 });
    expect(result).toHaveLength(5);
  });

  it("clamps scores to 0-1 range", () => {
    const rawTags = [
      { name: "over", score: 1.5 },
      { name: "under", score: -0.3 },
      { name: "normal", score: 0.8 },
    ];

    const result = normalizeTags(rawTags);
    for (const tag of result) {
      expect(tag.score).toBeGreaterThanOrEqual(0);
      expect(tag.score).toBeLessThanOrEqual(1);
    }
  });

  it("filters out empty tag names after normalization", () => {
    const rawTags = [
      { name: "valid-tag", score: 0.9 },
      { name: "!!!!", score: 0.8 }, // becomes empty after normalization
      { name: "   ", score: 0.7 }, // whitespace only
    ];

    const result = normalizeTags(rawTags);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("valid-tag");
  });

  it("handles empty input", () => {
    expect(normalizeTags([])).toEqual([]);
  });

  it("deduplicates similar tags across the pipeline", () => {
    const rawTags = [
      { name: "JavaScript", score: 0.9 },
      { name: "javascript", score: 0.85 },
      { name: "TypeScript", score: 0.8 },
    ];

    const result = normalizeTags(rawTags);
    // "JavaScript" and "javascript" normalize to the same thing
    const jsCount = result.filter((t) => t.name === "javascript").length;
    expect(jsCount).toBe(1);
  });
});
