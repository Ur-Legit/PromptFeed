# PromptFeed

Write a prompt, get a feed. Each prompt becomes its own news feed that PromptFeed keeps fresh through the day. Make as many feeds as you want.

## How it works

1. **Create a feed.** Claude reads your prompt and turns it into a feed title and 3-5 news search queries.
2. **Gather.** On each refresh, PromptFeed pulls recent articles for those queries from Google News RSS (free, no key).
3. **Curate.** Claude picks the items that actually match your prompt, writes a short summary and a "why it's relevant" note for each, skips stories already in your feed, and can use web search to add related content beyond the news results.
4. **Stay fresh.** Every feed has a refresh interval (1-24h, default 3h). Feeds refresh when you open them past their interval, when you click **Refresh now**, and on a schedule via `/api/cron/refresh`.

## Stack

- **Next.js 16** (App Router, server actions) + TypeScript + Tailwind
- **Prisma 7** with SQLite locally (swap to Postgres for deployment, see below)
- **Claude API** (`claude-opus-5-5`) via `@anthropic-ai/sdk`, with web search and server-side refusal fallback
- **Google News RSS** for news candidates

Users are anonymous for now: each browser gets its own ID cookie and its own feeds. Real sign-in is a planned next step.

## Run it locally

```bash
npm install
cp .env.example .env      # then fill in ANTHROPIC_API_KEY
npx prisma migrate dev    # creates dev.db
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Name | What it's for |
| --- | --- |
| `ANTHROPIC_API_KEY` | Your key from https://console.anthropic.com |
| `DATABASE_URL` | `file:./dev.db` for SQLite |
| `CRON_SECRET` | Any random string; the scheduled refresh endpoint requires `Authorization: Bearer <CRON_SECRET>` |

### Scheduled refresh

`GET /api/cron/refresh` refreshes every feed whose interval has passed. On Vercel, `vercel.json` calls it hourly (Vercel sends the `CRON_SECRET` header automatically). Anywhere else, point any cron at it:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/refresh
```

## Deploying

SQLite doesn't persist on serverless hosts. To deploy (e.g. Vercel + Neon/Supabase Postgres):

1. In `prisma/schema.prisma` set `provider = "postgresql"` and delete `prisma/migrations`.
2. `npm install @prisma/adapter-pg` and in `src/lib/db.ts` replace `PrismaBetterSqlite3` with `PrismaPg({ connectionString: process.env.DATABASE_URL })`.
3. Run `npx prisma migrate dev --name init` against the Postgres database.

## Tests

```bash
npm test
```
