import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGoogleNewsRss } from "../src/lib/news.ts";
import { extractJson } from "../src/lib/claude.ts";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>"fusion" - Google News</title>
<item>
  <title>Helion raises $425M for fusion plant - TechCrunch</title>
  <link>https://news.google.com/rss/articles/abc</link>
  <pubDate>Fri, 10 Oct 2026 14:00:00 GMT</pubDate>
  <description>&lt;a href="https://x"&gt;Helion raises $425M&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font&gt;TechCrunch&lt;/font&gt;</description>
  <source url="https://techcrunch.com">TechCrunch</source>
</item>
<item>
  <title>Second story</title>
  <link>https://news.google.com/rss/articles/def</link>
  <pubDate>not a date</pubDate>
</item>
</channel></rss>`;

test("parses Google News RSS items", () => {
  const items = parseGoogleNewsRss(RSS);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Helion raises $425M for fusion plant");
  assert.equal(items[0].source, "TechCrunch");
  assert.equal(items[0].publishedAt?.toISOString(), "2026-10-10T14:00:00.000Z");
  assert.equal(items[0].snippet, "Helion raises $425M TechCrunch");
  assert.equal(items[1].publishedAt, undefined);
});

test("handles a feed with a single item", () => {
  const single = RSS.replace(/<item>\s*<title>Second[\s\S]*?<\/item>/, "");
  assert.equal(parseGoogleNewsRss(single).length, 1);
});

test("handles an empty feed", () => {
  assert.deepEqual(parseGoogleNewsRss("<rss><channel></channel></rss>"), []);
});

test("extracts JSON after prose", () => {
  const text = 'Here are the picks.\n{"items": [{"url": "https://a.com", "title": "A"}]}';
  assert.deepEqual(extractJson(text), { items: [{ url: "https://a.com", title: "A" }] });
});

test("prefers the last fenced JSON block", () => {
  const text = 'Draft: ```json\n{"items": []}\n```\nFinal:\n```json\n{"items": [{"url": "u"}]}\n```';
  assert.deepEqual(extractJson(text), { items: [{ url: "u" }] });
});

test("throws when there is no JSON", () => {
  assert.throws(() => extractJson("no json here"));
});
