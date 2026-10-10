import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Candidate } from "./news";

const MODEL = "claude-opus-5-5";
// Server-side fallback: if a request is declined by a safety classifier,
// the API re-runs it on Anthropic's recommended fallback model.
const BETAS: Anthropic.Beta.AnthropicBeta[] = ["server-side-fallback-2026-07-01"];

let client: Anthropic | undefined;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to your .env file.");
  }
  client ??= new Anthropic();
  return client;
}

function textOf(message: Anthropic.Beta.BetaMessage) {
  if (message.stop_reason === "refusal") {
    throw new Error("Claude declined to process this feed prompt.");
  }
  return message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** Pulls the last JSON object out of a model reply (tolerates prose or code fences around it). */
export function extractJson(text: string): unknown {
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].pop();
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON found in Claude's reply.");
  return JSON.parse(body.slice(start, end + 1));
}

// ---------- Feed planning: prompt -> title + search queries ----------

const PlanSchema = z.object({
  title: z.string().min(1).max(80),
  queries: z.array(z.string().min(1)).min(1).max(6),
});
export type FeedPlan = z.infer<typeof PlanSchema>;

export async function planFeed(prompt: string): Promise<FeedPlan> {
  const message = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: BETAS,
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short feed name, 2-5 words" },
            queries: {
              type: "array",
              items: { type: "string" },
              description: "3-5 news search queries",
            },
          },
          required: ["title", "queries"],
          additionalProperties: false,
        },
      },
    },
    system:
      "You set up personalized news feeds. Given what a user wants to follow, " +
      "write a short feed title and 3-5 news search queries that together cover it. " +
      "Queries should be the kind of keywords a news search engine matches well: " +
      "specific names, terms, and phrases, not full sentences.",
    messages: [{ role: "user", content: `What I want to follow:\n${prompt}` }],
  });
  return PlanSchema.parse(JSON.parse(textOf(message)));
}

// ---------- Curation: candidates -> ranked, summarized feed items ----------

const CuratedSchema = z.object({
  items: z.array(
    z.object({
      url: z.string().url(),
      title: z.string().min(1),
      source: z.string().nullish(),
      summary: z.string().min(1),
      whyRelevant: z.string().nullish(),
      publishedAt: z.string().nullish(),
    }),
  ),
});
export type CuratedItem = z.infer<typeof CuratedSchema>["items"][number];

export async function curateItems(opts: {
  prompt: string;
  candidates: Candidate[];
  recentTitles: string[];
  maxItems?: number;
}): Promise<CuratedItem[]> {
  const { prompt, candidates, recentTitles, maxItems = 8 } = opts;

  const candidateList = candidates
    .map((c, i) =>
      [
        `[${i + 1}] ${c.title}`,
        `URL: ${c.url}`,
        c.source && `Source: ${c.source}`,
        c.publishedAt && `Published: ${c.publishedAt.toISOString()}`,
        c.snippet && `Snippet: ${c.snippet.slice(0, 300)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  const userContent = `The user's feed prompt:
<prompt>
${prompt}
</prompt>

Headlines already in their feed (don't repeat these stories):
${recentTitles.length ? recentTitles.map((t) => `- ${t}`).join("\n") : "(none yet)"}

Fresh news candidates:
${candidateList || "(none found this time)"}

Pick up to ${maxItems} items that best match what the user asked for. Prefer the candidates above. You may use web search to find other recent, relevant content (articles, posts, videos, releases) if the candidates are thin or miss part of the prompt. Skip anything off-topic, duplicated, or already in their feed. It's fine to return fewer items, or none.

For each item write a 1-2 sentence summary of what's new, and a short note on why it matches the prompt. Use the item's real URL.

Finish your reply with only a JSON object in this shape:
{"items": [{"url": "...", "title": "...", "source": "...", "summary": "...", "whyRelevant": "...", "publishedAt": "ISO date or null"}]}`;

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: userContent }];

  let message: Anthropic.Beta.BetaMessage | undefined;
  // Web search runs server-side; a long search turn may pause and need continuing.
  for (let i = 0; i < 4; i++) {
    message = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: BETAS,
      fallbacks: "default",
      output_config: { effort: "medium" },
      system:
        "You curate a personalized news feed. You are selective: quality and relevance over volume.",
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
      messages,
    });
    if (message.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: message.content });
  }

  return CuratedSchema.parse(extractJson(textOf(message!))).items;
}
