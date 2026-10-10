import { refreshDueFeeds } from "@/lib/feeds";

export const maxDuration = 300;

// Called every 30 minutes by .github/workflows/refresh.yml (or any cron that sends the secret).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await refreshDueFeeds());
}
