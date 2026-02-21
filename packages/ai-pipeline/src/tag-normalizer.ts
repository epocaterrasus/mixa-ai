// @mixa-ai/ai-pipeline — Tag normalization and deduplication

/** A normalized tag with its original form preserved */
export interface NormalizedTag {
  /** The normalized tag name (lowercase, trimmed) */
  name: string;
  /** The confidence score from the LLM (0-1) */
  score: number;
}

/**
 * Normalize a single tag string:
 * - Trim whitespace
 * - Lowercase
 * - Replace multiple spaces/hyphens with single hyphen
 * - Remove non-alphanumeric characters except hyphens and spaces
 * - Collapse whitespace to single space
 */
export function normalizeTagName(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Compute simple similarity between two tag names.
 * Returns a value between 0 and 1.
 * Uses Dice coefficient on character bigrams.
 */
function bigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigramsA = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) {
    bigramsA.add(a.slice(i, i + 2));
  }

  const bigramsB = new Set<string>();
  for (let i = 0; i < b.length - 1; i++) {
    bigramsB.add(b.slice(i, i + 2));
  }

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Deduplicate tags by merging similar ones.
 * Two tags are considered duplicates if their normalized names match
 * or if their bigram similarity exceeds the threshold.
 *
 * When merging, the tag with the higher score is kept.
 */
export function deduplicateTags(
  tags: NormalizedTag[],
  similarityThreshold = 0.8,
): NormalizedTag[] {
  const result: NormalizedTag[] = [];

  for (const tag of tags) {
    const existing = result.find(
      (r) =>
        r.name === tag.name ||
        bigramSimilarity(r.name, tag.name) >= similarityThreshold,
    );

    if (existing) {
      // Keep the one with higher score
      if (tag.score > existing.score) {
        existing.name = tag.name;
        existing.score = tag.score;
      }
    } else {
      result.push({ ...tag });
    }
  }

  return result;
}

/**
 * Full tag normalization pipeline:
 * 1. Normalize each tag name
 * 2. Filter out empty tags
 * 3. Deduplicate similar tags
 * 4. Sort by score descending
 * 5. Limit to maxTags
 */
export function normalizeTags(
  rawTags: Array<{ name: string; score: number }>,
  options?: {
    /** Maximum number of tags to return (default: 7) */
    maxTags?: number;
    /** Minimum number of tags to return (default: 3) */
    minTags?: number;
    /** Bigram similarity threshold for merging (default: 0.8) */
    similarityThreshold?: number;
  },
): NormalizedTag[] {
  const maxTags = options?.maxTags ?? 7;
  const similarityThreshold = options?.similarityThreshold ?? 0.8;

  // Step 1: Normalize names
  const normalized: NormalizedTag[] = rawTags
    .map((t) => ({
      name: normalizeTagName(t.name),
      score: Math.max(0, Math.min(1, t.score)),
    }))
    .filter((t) => t.name.length > 0);

  // Step 2: Deduplicate
  const deduped = deduplicateTags(normalized, similarityThreshold);

  // Step 3: Sort by score descending
  deduped.sort((a, b) => b.score - a.score);

  // Step 4: Limit to maxTags
  return deduped.slice(0, maxTags);
}
