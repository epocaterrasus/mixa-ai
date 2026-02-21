// @mixa-ai/ai-pipeline — Hybrid search combining vector similarity and full-text search

import type postgres from "postgres";
import type { ProviderRouter } from "./providers/router.js";
import type { ItemType } from "@mixa-ai/types";

// ── Public interfaces ─────────────────────────────────────────────

/** Options for hybrid search */
export interface SearchOptions {
  /** Maximum number of results to return (default: 20) */
  limit?: number;
  /** Minimum relevance score threshold 0-1 (default: 0.1) */
  minScore?: number;
  /** Weight for vector similarity in hybrid scoring 0-1 (default: 0.7) */
  vectorWeight?: number;
  /** Weight for full-text search in hybrid scoring 0-1 (default: 0.3) */
  ftsWeight?: number;
  /** Filter by tag IDs */
  tagIds?: string[];
  /** Filter by project IDs */
  projectIds?: string[];
  /** Filter by item types */
  itemTypes?: ItemType[];
  /** Filter items captured after this date */
  dateFrom?: Date;
  /** Filter items captured before this date */
  dateTo?: Date;
}

/** An item in a search result */
export interface SearchResultItem {
  id: string;
  title: string;
  url: string | null;
  domain: string | null;
  summary: string | null;
  itemType: string;
  thumbnailUrl: string | null;
  faviconUrl: string | null;
  capturedAt: Date;
}

/** A chunk within a search result */
export interface SearchResultChunk {
  id: string;
  content: string;
  chunkIndex: number;
  score: number;
}

/** A single search result */
export interface SearchResult {
  /** The matching item */
  item: SearchResultItem;
  /** Combined relevance score (0-1) */
  score: number;
  /** Highlighted snippet from full-text search */
  snippet: string | null;
  /** Top matching chunks from vector search */
  matchingChunks: SearchResultChunk[];
}

// ── Internal raw hit types (used by mergeResults) ─────────────────

export interface RawVectorHit {
  itemId: string;
  chunkId: string;
  content: string;
  chunkIndex: number;
  score: number;
  item: SearchResultItem;
}

export interface RawFtsHit {
  itemId: string;
  score: number;
  snippet: string | null;
  item: SearchResultItem;
}

// ── Defaults ──────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const DEFAULT_MIN_SCORE = 0.1;
const DEFAULT_VECTOR_WEIGHT = 0.7;
const DEFAULT_FTS_WEIGHT = 0.3;
const MAX_CHUNKS_PER_ITEM = 3;

// ── Score normalization ───────────────────────────────────────────

/** Normalize an array of scores to the 0-1 range (divide by max). */
export function normalizeScores(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const max = Math.max(...scores);
  if (max === 0) return scores.map(() => 0);
  return scores.map((s) => s / max);
}

// ── Result merging ────────────────────────────────────────────────

/**
 * Merge vector and FTS search results into a single ranked list.
 *
 * Scores from both sources are normalized to 0-1, then combined using
 * the provided weights. Results below `minScore` are dropped.
 */
export function mergeResults(
  vectorHits: RawVectorHit[],
  ftsHits: RawFtsHit[],
  vectorWeight: number,
  ftsWeight: number,
  minScore: number,
  limit: number,
): SearchResult[] {
  // Normalize vector scores
  const normalizedVectorScores = normalizeScores(
    vectorHits.map((h) => h.score),
  );

  // Normalize FTS scores
  const normalizedFtsScores = normalizeScores(ftsHits.map((h) => h.score));

  // Group vector hits by item, tracking best score and chunks
  const vectorByItem = new Map<
    string,
    { chunks: SearchResultChunk[]; bestScore: number; item: SearchResultItem }
  >();

  for (let i = 0; i < vectorHits.length; i++) {
    const hit = vectorHits[i]!;
    const normalizedScore = normalizedVectorScores[i]!;
    const existing = vectorByItem.get(hit.itemId);

    const chunk: SearchResultChunk = {
      id: hit.chunkId,
      content: hit.content,
      chunkIndex: hit.chunkIndex,
      score: normalizedScore,
    };

    if (existing) {
      existing.chunks.push(chunk);
      existing.bestScore = Math.max(existing.bestScore, normalizedScore);
    } else {
      vectorByItem.set(hit.itemId, {
        chunks: [chunk],
        bestScore: normalizedScore,
        item: hit.item,
      });
    }
  }

  // Build FTS lookup
  const ftsMap = new Map<
    string,
    { score: number; snippet: string | null; item: SearchResultItem }
  >();

  for (let i = 0; i < ftsHits.length; i++) {
    const hit = ftsHits[i]!;
    ftsMap.set(hit.itemId, {
      score: normalizedFtsScores[i]!,
      snippet: hit.snippet,
      item: hit.item,
    });
  }

  // Collect all unique item IDs
  const allItemIds = new Set([...vectorByItem.keys(), ...ftsMap.keys()]);

  // Calculate hybrid scores and build results
  const results: SearchResult[] = [];

  for (const itemId of allItemIds) {
    const vectorEntry = vectorByItem.get(itemId);
    const ftsEntry = ftsMap.get(itemId);

    const vs = vectorEntry?.bestScore ?? 0;
    const fs = ftsEntry?.score ?? 0;
    const hybridScore = vectorWeight * vs + ftsWeight * fs;

    if (hybridScore < minScore) continue;

    // Get item metadata from whichever source has it
    const item = vectorEntry?.item ?? ftsEntry?.item;
    if (!item) continue;

    // Get chunks sorted by score, limited
    const matchingChunks = (vectorEntry?.chunks ?? [])
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CHUNKS_PER_ITEM);

    results.push({
      item,
      score: hybridScore,
      snippet: ftsEntry?.snippet ?? null,
      matchingChunks,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ── SQL row types (snake_case to match PostgreSQL column names) ───

interface VectorRow {
  chunk_id: string;
  item_id: string;
  content: string;
  chunk_index: number;
  vector_score: number;
  title: string;
  url: string | null;
  domain: string | null;
  summary: string | null;
  item_type: string;
  thumbnail_url: string | null;
  favicon_url: string | null;
  captured_at: Date;
}

interface FtsRow {
  item_id: string;
  title: string;
  url: string | null;
  domain: string | null;
  summary: string | null;
  item_type: string;
  thumbnail_url: string | null;
  favicon_url: string | null;
  captured_at: Date;
  fts_score: number;
  snippet: string | null;
}

// ── Vector search ─────────────────────────────────────────────────

async function executeVectorSearch(
  sql: postgres.Sql,
  router: ProviderRouter,
  query: string,
  userId: string,
  options: SearchOptions | undefined,
  limit: number,
): Promise<RawVectorHit[]> {
  // Generate query embedding
  let queryEmbedding: number[];
  try {
    const provider = router.getEmbeddingProvider();
    const model = router.getEmbeddingModel();
    const response = await provider.embed({ model, input: query });
    const embedding = response.embeddings[0];
    if (!embedding) {
      return [];
    }
    queryEmbedding = embedding;
  } catch {
    // If embedding generation fails, gracefully skip vector search
    return [];
  }

  const vectorStr = `[${queryEmbedding.join(",")}]`;

  const rows = await sql<VectorRow[]>`
    SELECT
      c.id AS chunk_id,
      c.item_id,
      c.content,
      c.chunk_index,
      1 - (c.embedding <=> ${vectorStr}::vector) AS vector_score,
      i.title,
      i.url,
      i.domain,
      i.summary,
      i.item_type,
      i.thumbnail_url,
      i.favicon_url,
      i.captured_at
    FROM chunks c
    JOIN items i ON i.id = c.item_id
    WHERE i.user_id = ${userId}
      AND c.embedding IS NOT NULL
      ${options?.itemTypes?.length ? sql`AND i.item_type = ANY(${options.itemTypes})` : sql``}
      ${options?.tagIds?.length ? sql`AND i.id IN (SELECT it.item_id FROM item_tags it WHERE it.tag_id = ANY(${options.tagIds}))` : sql``}
      ${options?.projectIds?.length ? sql`AND i.id IN (SELECT ip.item_id FROM item_projects ip WHERE ip.project_id = ANY(${options.projectIds}))` : sql``}
      ${options?.dateFrom ? sql`AND i.captured_at >= ${options.dateFrom}` : sql``}
      ${options?.dateTo ? sql`AND i.captured_at <= ${options.dateTo}` : sql``}
    ORDER BY c.embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    itemId: row.item_id,
    chunkId: row.chunk_id,
    content: row.content,
    chunkIndex: row.chunk_index,
    score: row.vector_score,
    item: {
      id: row.item_id,
      title: row.title,
      url: row.url,
      domain: row.domain,
      summary: row.summary,
      itemType: row.item_type,
      thumbnailUrl: row.thumbnail_url,
      faviconUrl: row.favicon_url,
      capturedAt: row.captured_at,
    },
  }));
}

// ── Full-text search ──────────────────────────────────────────────

async function executeFullTextSearch(
  sql: postgres.Sql,
  query: string,
  userId: string,
  options: SearchOptions | undefined,
  limit: number,
): Promise<RawFtsHit[]> {
  const rows = await sql<FtsRow[]>`
    SELECT
      i.id AS item_id,
      i.title,
      i.url,
      i.domain,
      i.summary,
      i.item_type,
      i.thumbnail_url,
      i.favicon_url,
      i.captured_at,
      ts_rank(
        to_tsvector('english', coalesce(i.title, '') || ' ' || coalesce(i.content_text, '')),
        plainto_tsquery('english', ${query})
      ) AS fts_score,
      ts_headline(
        'english',
        coalesce(i.content_text, ''),
        plainto_tsquery('english', ${query}),
        'MaxWords=50, MinWords=20, StartSel=<<, StopSel=>>'
      ) AS snippet
    FROM items i
    WHERE i.user_id = ${userId}
      AND to_tsvector('english', coalesce(i.title, '') || ' ' || coalesce(i.content_text, ''))
          @@ plainto_tsquery('english', ${query})
      ${options?.itemTypes?.length ? sql`AND i.item_type = ANY(${options.itemTypes})` : sql``}
      ${options?.tagIds?.length ? sql`AND i.id IN (SELECT it.item_id FROM item_tags it WHERE it.tag_id = ANY(${options.tagIds}))` : sql``}
      ${options?.projectIds?.length ? sql`AND i.id IN (SELECT ip.item_id FROM item_projects ip WHERE ip.project_id = ANY(${options.projectIds}))` : sql``}
      ${options?.dateFrom ? sql`AND i.captured_at >= ${options.dateFrom}` : sql``}
      ${options?.dateTo ? sql`AND i.captured_at <= ${options.dateTo}` : sql``}
    ORDER BY fts_score DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    itemId: row.item_id,
    score: row.fts_score,
    snippet: row.snippet,
    item: {
      id: row.item_id,
      title: row.title,
      url: row.url,
      domain: row.domain,
      summary: row.summary,
      itemType: row.item_type,
      thumbnailUrl: row.thumbnail_url,
      faviconUrl: row.favicon_url,
      capturedAt: row.captured_at,
    },
  }));
}

// ── Main hybrid search ────────────────────────────────────────────

/**
 * Perform hybrid search combining vector similarity and full-text search.
 *
 * 1. Embeds the query using the configured embedding provider
 * 2. Runs vector similarity search on the chunks table (pgvector)
 * 3. Runs full-text search on the items table (PostgreSQL tsvector)
 * 4. Normalizes and combines scores with configurable weights
 * 5. Returns ranked results with matching snippets and chunks
 *
 * If the embedding provider is unavailable, falls back to FTS-only.
 */
export async function hybridSearch(
  sql: postgres.Sql,
  router: ProviderRouter,
  query: string,
  userId: string,
  options?: SearchOptions,
): Promise<SearchResult[]> {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const minScore = options?.minScore ?? DEFAULT_MIN_SCORE;
  const vectorWeight = options?.vectorWeight ?? DEFAULT_VECTOR_WEIGHT;
  const ftsWeight = options?.ftsWeight ?? DEFAULT_FTS_WEIGHT;

  // Fetch more candidates than needed so hybrid scoring can rerank
  const [vectorHits, ftsHits] = await Promise.all([
    executeVectorSearch(sql, router, query, userId, options, limit * 3),
    executeFullTextSearch(sql, query, userId, options, limit * 2),
  ]);

  return mergeResults(
    vectorHits,
    ftsHits,
    vectorWeight,
    ftsWeight,
    minScore,
    limit,
  );
}
