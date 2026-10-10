"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteFeedAction, refreshFeedAction, updateIntervalAction } from "@/app/actions";

const INTERVALS = [1, 3, 6, 12, 24];

export function FeedControls(props: { feedId: string; due: boolean; intervalHours: number }) {
  const { feedId, due, intervalHours } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const autoRan = useRef(false);

  function refresh() {
    setNotice(null);
    startTransition(async () => {
      const result = await refreshFeedAction(feedId);
      if (result.error) setNotice(result.error);
      else setNotice(result.added ? `Added ${result.added} new items.` : "Nothing new right now.");
      router.refresh();
    });
  }

  // Refresh on open when the feed is past its interval, so it stays fresh even without the scheduled job.
  useEffect(() => {
    if (due && !autoRan.current) {
      autoRan.current = true;
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due]);

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button
        onClick={refresh}
        disabled={pending}
        className="rounded-lg bg-amber-500 px-3 py-1.5 font-medium text-stone-950 hover:bg-amber-400 disabled:opacity-60"
      >
        {pending ? "Finding new items…" : "Refresh now"}
      </button>
      <label className="flex items-center gap-2 text-stone-500">
        Refresh every
        <select
          defaultValue={intervalHours}
          onChange={(e) =>
            startTransition(() => updateIntervalAction(feedId, Number(e.target.value)))
          }
          className="rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1"
        >
          {INTERVALS.map((h) => (
            <option key={h} value={h}>
              {h}h
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={() => {
          if (confirm("Delete this feed and all its items?")) {
            startTransition(() => deleteFeedAction(feedId));
          }
        }}
        className="ml-auto text-stone-400 hover:text-red-600"
      >
        Delete feed
      </button>
      {notice && <p className="w-full text-stone-500">{notice}</p>}
    </div>
  );
}
