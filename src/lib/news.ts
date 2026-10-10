import { XMLParser } from "fast-xml-parser";

export type Candidate = {
  url: string;
  title: string;
  source?: string;
  publishedAt?: Date;
  snippet?: string;
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parses a Google News RSS document into candidates. Exported for tests. */
export function parseGoogleNewsRss(xml: string): Candidate[] {
  const doc = parser.parse(xml);
  const raw = doc?.rss?.channel?.item ?? [];
  const items = Array.isArray(raw) ? raw : [raw];
  return items
    .filter((it) => it?.link && it?.title)
    .map((it) => {
      const source = typeof it.source === "object" ? it.source["#text"] : it.source;
      // Google News appends " - Source" to titles; drop it since we show source separately.
      let title = String(it.title);
      if (source && title.endsWith(` - ${source}`)) {
        title = title.slice(0, -(source.length + 3));
      }
      const published = it.pubDate ? new Date(it.pubDate) : undefined;
      return {
        url: String(it.link),
        title,
        source: source ? String(source) : undefined,
        publishedAt: published && !isNaN(published.getTime()) ? published : undefined,
        snippet: it.description ? stripHtml(String(it.description)) : undefined,
      };
    });
}

/** Free news search via Google News RSS. No API key needed. */
export async function searchNews(query: string, limit = 10): Promise<Candidate[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    `${query} when:2d`,
  )}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PromptFeed/0.1" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google News returned ${res.status} for "${query}"`);
  return parseGoogleNewsRss(await res.text()).slice(0, limit);
}

/**
 * Runs every query, merges results, and drops duplicates by URL and title.
 * Failed queries are reported in `errors` rather than thrown, so a news outage
 * doesn't block the feed (Claude can still search the web).
 */
export async function gatherCandidates(
  queries: string[],
): Promise<{ candidates: Candidate[]; errors: string[] }> {
  const results = await Promise.allSettled(queries.map((q) => searchNews(q)));
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const candidates: Candidate[] = [];
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "rejected") {
      errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
      continue;
    }
    for (const c of r.value) {
      const key = c.title.toLowerCase();
      if (seenUrls.has(c.url) || seenTitles.has(key)) continue;
      seenUrls.add(c.url);
      seenTitles.add(key);
      candidates.push(c);
    }
  }
  candidates.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  return { candidates, errors };
}
