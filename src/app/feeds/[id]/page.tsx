import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FeedControls } from "@/components/FeedControls";
import { db } from "@/lib/db";
import { feedQueries, isDue } from "@/lib/feeds";
import { timeAgo } from "@/lib/time";
import { getUserId } from "@/lib/user";

export default function FeedPage({ params }: PageProps<"/feeds/[id]">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading feed…</p>}>
      <Feed params={params} />
    </Suspense>
  );
}

async function Feed({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  const feed = await db.feed.findFirst({
    where: { id, userId },
    include: { items: { orderBy: { createdAt: "desc" }, take: 100 } },
  });
  if (!feed) notFound();

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{feed.title}</h1>
        <p className="text-stone-500">{feed.prompt}</p>
        <div className="flex flex-wrap gap-1.5">
          {feedQueries(feed).map((q) => (
            <span
              key={q}
              className="rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 text-xs text-stone-600 dark:text-stone-400"
            >
              {q}
            </span>
          ))}
        </div>
        <p className="text-xs text-stone-400">Last updated {timeAgo(feed.lastRefreshedAt)}</p>
      </section>

      <FeedControls feedId={feed.id} due={isDue(feed)} intervalHours={feed.refreshIntervalHours} />

      {feed.lastError && (
        <p className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          Last refresh failed: {feed.lastError}
        </p>
      )}

      {feed.items.length === 0 ? (
        <p className="text-stone-500">No items yet. The first refresh fills this in.</p>
      ) : (
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {feed.items.map((item) => (
            <li key={item.id} className="py-4 space-y-1">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-amber-600"
              >
                {item.title}
              </a>
              <p className="text-sm text-stone-600 dark:text-stone-300">{item.summary}</p>
              {item.whyRelevant && (
                <p className="text-xs text-stone-500 italic">{item.whyRelevant}</p>
              )}
              <p className="text-xs text-stone-400">
                {[item.source, timeAgo(item.publishedAt ?? item.createdAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
