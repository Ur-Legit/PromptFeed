"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createFeed, refreshFeed } from "@/lib/feeds";
import { getUserId } from "@/lib/user";

export type FormState = { error?: string };

async function ownedFeed(feedId: string) {
  const userId = await getUserId();
  const feed = await db.feed.findFirst({ where: { id: feedId, userId } });
  if (!feed) throw new Error("Feed not found");
  return feed;
}

export async function createFeedAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const prompt = String(formData.get("prompt") ?? "").trim();
  if (prompt.length < 3) return { error: "Describe what you want to follow." };
  if (prompt.length > 1000) return { error: "Keep the prompt under 1000 characters." };

  let feedId: string;
  try {
    const feed = await createFeed(await getUserId(), prompt);
    feedId = feed.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't create the feed." };
  }
  redirect(`/feeds/${feedId}`);
}

export async function refreshFeedAction(
  feedId: string,
): Promise<{ added?: number; error?: string }> {
  await ownedFeed(feedId);
  try {
    const added = await refreshFeed(feedId);
    return { added };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Refresh failed." };
  } finally {
    revalidatePath(`/feeds/${feedId}`);
    revalidatePath("/");
  }
}

export async function updateIntervalAction(feedId: string, minutes: number) {
  await ownedFeed(feedId);
  const clamped = Math.min(24 * 60, Math.max(30, Math.round(minutes)));
  await db.feed.update({ where: { id: feedId }, data: { refreshIntervalMinutes: clamped } });
  revalidatePath(`/feeds/${feedId}`);
}

export async function deleteFeedAction(feedId: string) {
  await ownedFeed(feedId);
  await db.feed.delete({ where: { id: feedId } });
  revalidatePath("/");
  redirect("/");
}
