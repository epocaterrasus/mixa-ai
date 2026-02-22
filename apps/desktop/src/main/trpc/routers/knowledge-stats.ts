import { eq } from "drizzle-orm";
import { items } from "@mixa-ai/db";
import { router, publicProcedure } from "../trpc.js";

type ItemRow = typeof items.$inferSelect;

function countBy(rows: ItemRow[], key: keyof ItemRow): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const val = String(row[key] ?? "unknown");
    counts[val] = (counts[val] ?? 0) + 1;
  }
  return counts;
}

function countByDay(rows: ItemRow[]): Array<{ date: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const date = row.capturedAt.toISOString().slice(0, 10);
    counts[date] = (counts[date] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function topN(counts: Record<string, number>, n: number): Array<{ key: string; count: number }> {
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export const knowledgeStatsRouter = router({
  overview: publicProcedure.query(async ({ ctx }) => {
    const allItems = await ctx.db
      .select()
      .from(items)
      .where(eq(items.userId, ctx.userId));

    const total = allItems.length;
    const favorites = allItems.filter((i) => i.isFavorite).length;
    const archived = allItems.filter((i) => i.isArchived).length;

    const totalWordCount = allItems.reduce((sum, i) => sum + (i.wordCount ?? 0), 0);
    const totalReadingTime = allItems.reduce((sum, i) => sum + (i.readingTime ?? 0), 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentItems = allItems.filter((i) => i.capturedAt >= thirtyDaysAgo);
    const capturesByDay = countByDay(recentItems);

    const byItemType = countBy(allItems, "itemType");

    const domainCounts = countBy(
      allItems.filter((i) => i.domain !== null),
      "domain",
    );
    const topDomains = topN(domainCounts, 10);

    const recentCaptures = [...allItems]
      .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        domain: item.domain,
        itemType: item.itemType,
        wordCount: item.wordCount,
        readingTime: item.readingTime,
        capturedAt: item.capturedAt.toISOString(),
      }));

    return {
      total,
      favorites,
      archived,
      totalWordCount,
      totalReadingTime,
      capturesByDay,
      byItemType,
      topDomains,
      recentCaptures,
    };
  }),
});
