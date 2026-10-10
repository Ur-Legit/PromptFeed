import Link from "next/link";
import { Suspense } from "react";
import { NewFeedForm } from "@/components/NewFeedForm";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/time";
import { getUserId } from "@/lib/user";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Make a feed from a prompt</h1>
        <p className="text-stone-500">
          Describe anything you care about. PromptFeed finds the news and related content and keeps
          it fresh through the day.
        </p>
      </section>

      <NewFeedForm />

      <Suspense fallback={<p className="text-stone-500">Loading your feeds…</p>}>
        <FeedList />
      </Suspense>
    </div>
  );
}

async function FeedList() {
  const userId = await getUserId();
  const feeds = await db.feed.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { createdAt: "desc" }, take: 1, select: { title: true } },
      _count: { select: { items: true } },
    },
  });

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
        Your feeds ({feeds.length})
      </h2>
      {feeds.length === 0 ? (
        <p className="text-stone-500">No feeds yet. Create your first one above.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {feeds.map((feed) => (
            <li key={feed.id}>
              <Link
                href={`/feeds/${feed.id}`}
                className="block h-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 hover:border-amber-500"
              >
                <div className="font-medium">{feed.title}</div>
                <div className="mt-1 line-clamp-2 text-sm text-stone-500">
                  {feed.items[0]?.title ?? feed.prompt}
                </div>
                <div className="mt-3 text-xs text-stone-400">
                  {feed._count.items} items · updated {timeAgo(feed.lastRefreshedAt)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
