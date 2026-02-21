import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { captureStore } from "../../capture/service.js";

const itemTypeSchema = z.enum([
  "article",
  "highlight",
  "youtube",
  "pdf",
  "code",
  "image",
  "terminal",
]);

/** Common stopwords to skip when matching */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "its", "this", "that", "are",
  "was", "were", "be", "been", "has", "have", "had", "do", "does", "did",
  "will", "can", "could", "should", "would", "may", "not", "no", "all",
  "how", "what", "when", "where", "who", "which", "why", "new", "you",
  "your", "we", "our", "they", "their", "about", "into", "just", "also",
]);

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Generate a snippet from content text highlighting matching query words.
 * Uses << and >> as highlight delimiters.
 */
function generateSnippet(contentText: string, queryWords: string[], maxLen: number = 150): string {
  if (!contentText) return "";
  const lower = contentText.toLowerCase();

  // Find the first position where a query word appears
  let bestPos = 0;
  for (const word of queryWords) {
    const idx = lower.indexOf(word);
    if (idx !== -1) {
      bestPos = Math.max(0, idx - 30);
      break;
    }
  }

  // Extract snippet around that position
  const start = bestPos;
  const end = Math.min(contentText.length, start + maxLen);
  let snippet = contentText.slice(start, end).trim();

  if (start > 0) snippet = `...${snippet}`;
  if (end < contentText.length) snippet = `${snippet}...`;

  return snippet;
}

export const searchRouter = router({
  hybrid: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(50).default(10),
        filters: z
          .object({
            itemTypes: z.array(itemTypeSchema).optional(),
            tagIds: z.array(z.string().uuid()).optional(),
            projectIds: z.array(z.string().uuid()).optional(),
            dateFrom: z.string().datetime().optional(),
            dateTo: z.string().datetime().optional(),
            isFavorite: z.boolean().optional(),
          })
          .default({}),
        vectorWeight: z.number().min(0).max(1).default(0.6),
        ftsWeight: z.number().min(0).max(1).default(0.4),
        minScore: z.number().min(0).max(1).default(0.1),
      }),
    )
    .query(async ({ input }) => {
      // In-memory text search against captureStore
      // Will be replaced with hybrid search (pgvector + FTS) when PGlite is integrated
      const allItems = captureStore.getAll();
      const queryWords = extractWords(input.query);

      if (queryWords.length === 0) {
        return { results: [], total: 0 };
      }

      const scored: Array<{
        itemId: string;
        title: string;
        snippet: string;
        score: number;
        itemType: string;
        url: string | null;
        domain: string | null;
        summary: string | null;
        faviconUrl: string | null;
        capturedAt: string;
      }> = [];

      for (const item of allItems) {
        // Apply filters
        if (input.filters.itemTypes?.length) {
          if (!input.filters.itemTypes.includes(item.itemType as typeof input.filters.itemTypes[number])) {
            continue;
          }
        }
        if (input.filters.isFavorite !== undefined && item.isFavorite !== input.filters.isFavorite) {
          continue;
        }
        if (input.filters.dateFrom && item.capturedAt < input.filters.dateFrom) {
          continue;
        }
        if (input.filters.dateTo && item.capturedAt > input.filters.dateTo) {
          continue;
        }

        // Score based on text matching
        const titleWords = extractWords(item.title);
        const contentWords = item.contentText ? extractWords(item.contentText) : [];
        const descWords = item.description ? extractWords(item.description) : [];

        let titleMatches = 0;
        let contentMatches = 0;
        let descMatches = 0;

        const contentWordSet = new Set(contentWords);
        const descWordSet = new Set(descWords);

        for (const qw of queryWords) {
          if (titleWords.includes(qw)) titleMatches += 1;
          if (contentWordSet.has(qw)) contentMatches += 1;
          if (descWordSet.has(qw)) descMatches += 1;
        }

        // Weighted scoring: title matches count more
        const titleScore = queryWords.length > 0 ? (titleMatches / queryWords.length) * 0.5 : 0;
        const contentScore = queryWords.length > 0 ? (contentMatches / queryWords.length) * 0.3 : 0;
        const descScore = queryWords.length > 0 ? (descMatches / queryWords.length) * 0.2 : 0;
        const totalScore = titleScore + contentScore + descScore;

        if (totalScore >= input.minScore) {
          scored.push({
            itemId: item.id,
            title: item.title,
            snippet: generateSnippet(item.contentText ?? item.description ?? "", queryWords),
            score: totalScore,
            itemType: item.itemType,
            url: item.url,
            domain: item.domain,
            summary: item.description,
            faviconUrl: item.faviconUrl,
            capturedAt: item.capturedAt,
          });
        }
      }

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score);
      const results = scored.slice(0, input.limit);

      return {
        results,
        total: scored.length,
      };
    }),
});
