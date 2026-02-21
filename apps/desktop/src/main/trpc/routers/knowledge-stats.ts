import { router, publicProcedure } from "../trpc.js";
import { captureStore, type CapturedItem } from "../../capture/service.js";

/** Group items by a key and return counts */
function countBy(items: CapturedItem[], key: keyof CapturedItem): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const val = String(item[key] ?? "unknown");
    counts[val] = (counts[val] ?? 0) + 1;
  }
  return counts;
}

/** Group items by date (YYYY-MM-DD) and return daily counts */
function countByDay(items: CapturedItem[]): Array<{ date: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const date = item.capturedAt.slice(0, 10); // YYYY-MM-DD
    counts[date] = (counts[date] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Get top N entries from a Record<string, number> sorted by count desc */
function topN(counts: Record<string, number>, n: number): Array<{ key: string; count: number }> {
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export const knowledgeStatsRouter = router({
  overview: publicProcedure.query(async () => {
    const items = captureStore.getAll();
    const total = items.length;
    const favorites = items.filter((i) => i.isFavorite).length;
    const archived = items.filter((i) => i.isArchived).length;

    const totalWordCount = items.reduce((sum, i) => sum + (i.wordCount ?? 0), 0);
    const totalReadingTime = items.reduce((sum, i) => sum + (i.readingTime ?? 0), 0);

    // Items captured per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentItems = items.filter((i) => i.capturedAt >= thirtyDaysAgo.toISOString());
    const capturesByDay = countByDay(recentItems);

    // Distribution by item type
    const byItemType = countBy(items, "itemType");

    // Top 10 domains
    const domainCounts = countBy(
      items.filter((i) => i.domain !== null),
      "domain",
    );
    const topDomains = topN(domainCounts, 10);

    // Recent captures (last 10)
    const recentCaptures = [...items]
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        domain: item.domain,
        itemType: item.itemType,
        wordCount: item.wordCount,
        readingTime: item.readingTime,
        capturedAt: item.capturedAt,
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
