# PromptFeed

Write a prompt, get a feed. Each prompt becomes its own news feed that PromptFeed keeps fresh through the day. Make as many feeds as you want.

## How it works

1. **Create a feed.** Claude reads your prompt and turns it into a feed title and 3-5 news search queries.
2. **Gather.** On each refresh, PromptFeed pulls recent articles for those queries from Google News RSS (free, no key).
3. **Curate.** Claude picks the items that actually match your prompt, writes a short summary and a "why it's relevant" note for each, skips stories already in your feed, and can use web search to add related content beyond the news results.
4. **Stay fresh.** Every feed has a refresh interval (30m to 24h, default 3h). Feeds refresh when you open them past their interval, when you click **Refresh now**, and on a schedule via `/api/cron/refresh`.

## Stack

- **Next.js 16** (App Router, server actions) + TypeScript + Tailwind
- **Prisma 7** with Postgres (via `@prisma/adapter-pg`)
- **Claude API** (`claude-opus-5-5`) via `@anthropic-ai/sdk`, with web search and server-side refusal fallback
- **Google News RSS** for news candidates

Users are anonymous for now: each browser gets its own ID cookie and its own feeds. Real sign-in is a planned next step.

## Run it locally

```bash
npm install
cp .env.example .env      # then fill in ANTHROPIC_API_KEY and DATABASE_URL
npx prisma migrate dev    # creates the tables
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Name | What it's for |
| --- | --- |
| `ANTHROPIC_API_KEY` | Your key from https://console.anthropic.com |
| `DATABASE_URL` | Postgres connection string (a free Neon database works locally too) |
| `CRON_SECRET` | Any random string; the scheduled refresh endpoint requires `Authorization: Bearer <CRON_SECRET>` |

### Scheduled refresh

`GET /api/cron/refresh` refreshes every feed whose interval has passed. `.github/workflows/refresh.yml` calls it every 30 minutes once the `APP_URL` and `CRON_SECRET` repository secrets are set. Any other cron works too:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/refresh
```

## Deploying to Vercel

1. **Database.** Create a free Postgres database at https://neon.tech (or add Neon from Vercel's Storage tab, which sets `DATABASE_URL` for you). Copy its connection string.
2. **Import.** At https://vercel.com/new, import this GitHub repo. Keep the defaults.
3. **Environment variables.** In the import screen (or later under Settings → Environment Variables) add `DATABASE_URL`, `ANTHROPIC_API_KEY`, and `CRON_SECRET` (any long random string). Deploy. The build runs `prisma migrate deploy`, so the tables are created on the first deploy.
4. **Scheduled refresh.** In this GitHub repo, under Settings → Secrets and variables → Actions, add `APP_URL` (your Vercel address, e.g. `https://promptfeed.vercel.app`) and `CRON_SECRET` (the same value as in Vercel). The **Refresh feeds** workflow then runs every 30 minutes; you can also start it from the Actions tab.

Vercel's free plan only allows its own cron jobs once a day, which is why the schedule runs from GitHub Actions instead.

## Tests

```bash
npm test
```
