import { refreshDueFeeds } from "@/lib/feeds";

export const maxDuration = 300;

// Called on a schedule (see vercel.json, or scripts/refresh.ts for self-hosting).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await refreshDueFeeds());
}
