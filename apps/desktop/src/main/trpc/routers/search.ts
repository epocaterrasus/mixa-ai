import { z } from "zod";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { items } from "@mixa-ai/db";
import { router, publicProcedure } from "../trpc.js";

const itemTypeSchema = z.enum([
  "article",
  "highlight",
  "youtube",
  "pdf",
  "code",
  "image",
  "terminal",
]);

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
    .query(async ({ ctx, input }) => {
      const tsQuery = input.query
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0)
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
        .filter((w) => w.length > 0)
        .join(" & ");

      if (!tsQuery) {
        return { results: [], total: 0 };
      }

      const conditions = [eq(items.userId, ctx.userId)];

      if (input.filters.itemTypes?.length) {
        conditions.push(
          sql`${items.itemType} = ANY(${input.filters.itemTypes})`,
        );
      }
      if (input.filters.isFavorite !== undefined) {
        conditions.push(eq(items.isFavorite, input.filters.isFavorite));
      }
      if (input.filters.dateFrom) {
        conditions.push(gte(items.capturedAt, new Date(input.filters.dateFrom)));
      }
      if (input.filters.dateTo) {
        conditions.push(lte(items.capturedAt, new Date(input.filters.dateTo)));
      }

      const where = and(...conditions);

      const ftsVector = sql`to_tsvector('english', coalesce(${items.title}, '') || ' ' || coalesce(${items.contentText}, ''))`;
      const tsQueryExpr = sql`to_tsquery('english', ${tsQuery})`;
      const rankExpr = sql<number>`ts_rank(${ftsVector}, ${tsQueryExpr})`;

      const rows = await ctx.db
        .select({
          id: items.id,
          title: items.title,
          contentText: items.contentText,
          description: items.description,
          itemType: items.itemType,
          url: items.url,
          domain: items.domain,
          summary: items.summary,
          faviconUrl: items.faviconUrl,
          capturedAt: items.capturedAt,
          rank: rankExpr,
        })
        .from(items)
        .where(and(where, sql`${ftsVector} @@ ${tsQueryExpr}`))
        .orderBy(sql`${rankExpr} DESC`)
        .limit(input.limit);

      const results = rows.map((row) => ({
        itemId: row.id,
        title: row.title,
        snippet: generateSnippet(row.contentText ?? row.description ?? "", input.query),
        score: Number(row.rank) || 0,
        itemType: row.itemType,
        url: row.url,
        domain: row.domain,
        summary: row.summary,
        faviconUrl: row.faviconUrl,
        capturedAt: row.capturedAt.toISOString(),
      }));

      return {
        results,
        total: results.length,
      };
    }),
});

function generateSnippet(contentText: string, query: string, maxLen: number = 150): string {
  if (!contentText) return "";
  const lower = contentText.toLowerCase();
  const queryLower = query.toLowerCase();

  const words = queryLower.split(/\s+/).filter((w) => w.length > 0);
  let bestPos = 0;
  for (const word of words) {
    const idx = lower.indexOf(word);
    if (idx !== -1) {
      bestPos = Math.max(0, idx - 30);
      break;
    }
  }

  const start = bestPos;
  const end = Math.min(contentText.length, start + maxLen);
  let snippet = contentText.slice(start, end).trim();

  if (start > 0) snippet = `...${snippet}`;
  if (end < contentText.length) snippet = `${snippet}...`;

  return snippet;
}
