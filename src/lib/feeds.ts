import { db } from "./db";
import { curateItems, planFeed } from "./claude";
import { gatherCandidates } from "./news";

export async function createFeed(userId: string, prompt: string) {
  const plan = await planFeed(prompt);
  return db.feed.create({
    data: {
      userId,
      prompt,
      title: plan.title,
      queries: JSON.stringify(plan.queries),
    },
  });
}

export function feedQueries(feed: { queries: string }): string[] {
  try {
    const parsed = JSON.parse(feed.queries);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function isDue(feed: {
  lastRefreshedAt: Date | null;
  refreshIntervalHours: number;
}) {
  if (!feed.lastRefreshedAt) return true;
  const ageMs = Date.now() - feed.lastRefreshedAt.getTime();
  return ageMs >= feed.refreshIntervalHours * 60 * 60 * 1000;
}

/** Fetches fresh candidates, has Claude curate them, and stores new items. Returns how many were added. */
export async function refreshFeed(feedId: string): Promise<number> {
  const feed = await db.feed.findUniqueOrThrow({ where: { id: feedId } });
  try {
    const [{ candidates, errors: newsErrors }, recent] = await Promise.all([
      gatherCandidates(feedQueries(feed)),
      db.feedItem.findMany({
        where: { feedId },
        orderBy: { createdAt: "desc" },
        take: 60,
        select: { url: true, title: true },
      }),
    ]);
    const knownUrls = new Set(recent.map((r) => r.url));
    const fresh = candidates.filter((c) => !knownUrls.has(c.url)).slice(0, 40);

    const curated = await curateItems({
      prompt: feed.prompt,
      candidates: fresh,
      recentTitles: recent.map((r) => r.title),
    });

    let added = 0;
    // Insert in reverse so Claude's top pick ends up newest (shown first).
    for (const item of [...curated].reverse()) {
      if (knownUrls.has(item.url)) continue;
      const published = item.publishedAt ? new Date(item.publishedAt) : null;
      const result = await db.feedItem.createMany({
        data: {
          feedId,
          url: item.url,
          title: item.title,
          source: item.source ?? null,
          summary: item.summary,
          whyRelevant: item.whyRelevant ?? null,
          publishedAt:
            published && !isNaN(published.getTime()) ? published : null,
        },
      });
      added += result.count;
      knownUrls.add(item.url);
    }

    // Only surface news-search failures when they left the refresh empty-handed.
    const lastError =
      added === 0 && newsErrors.length > 0
        ? `News search failed: ${newsErrors[0]}`
        : null;
    await db.feed.update({
      where: { id: feedId },
      data: { lastRefreshedAt: new Date(), lastError },
    });
    return added;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.feed.update({
      where: { id: feedId },
      // Record the attempt so a broken feed doesn't retry on every page load.
      data: { lastRefreshedAt: new Date(), lastError: message.slice(0, 500) },
    });
    throw err;
  }
}

/** Refreshes every feed whose interval has elapsed. Used by the scheduled job. */
export async function refreshDueFeeds() {
  const feeds = await db.feed.findMany();
  const due = feeds.filter(isDue);
  const results = [];
  for (const feed of due) {
    try {
      results.push({ id: feed.id, added: await refreshFeed(feed.id) });
    } catch (err) {
      results.push({
        id: feed.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { checked: feeds.length, refreshed: results };
}
