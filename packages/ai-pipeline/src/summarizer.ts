// @mixa-ai/ai-pipeline — Auto-summarization and auto-tagging via LLM

import type { LLMProviderName } from "@mixa-ai/types";
import type { ProviderRouter } from "./providers/router.js";
import type { ChatResponse } from "./providers/types.js";
import { normalizeTags, type NormalizedTag } from "./tag-normalizer.js";

/** Result of auto-summarization and auto-tagging */
export interface SummarizeResult {
  /** 2-3 sentence summary of the content */
  summary: string;
  /** Normalized topic tags with confidence scores */
  tags: NormalizedTag[];
}

/** Options for the summarizer */
export interface SummarizerOptions {
  /** Maximum content length (in characters) to send to the LLM. Default: 8000 */
  maxContentLength?: number;
  /** Maximum number of tags to generate. Default: 7 */
  maxTags?: number;
}

/** Cost-efficient models per provider — prefers cheapest available */
const CHEAP_MODELS: Record<LLMProviderName, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-haiku-20240307",
  ollama: "llama3.2",
  gemini: "gemini-2.0-flash-lite",
};

const SUMMARIZE_SYSTEM_PROMPT = `You are a content analysis assistant. Given an article or text content, you must:
1. Write a concise summary (2-3 sentences) capturing the key points.
2. Assign 3-7 topic tags that categorize the content.

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Your 2-3 sentence summary here.",
  "tags": [
    { "name": "tag-name", "score": 0.95 },
    { "name": "another-tag", "score": 0.8 }
  ]
}

Rules:
- Summary must be 2-3 sentences, factual, and concise.
- Tags should be lowercase topic labels (e.g., "machine-learning", "web-development", "typescript").
- Each tag must have a confidence score between 0 and 1.
- Generate between 3 and 7 tags, ordered by relevance.
- Do NOT include any text outside the JSON object.`;

/**
 * Build the user prompt with the content to summarize.
 * Truncates content if it exceeds maxContentLength.
 */
function buildUserPrompt(
  content: string,
  title: string | undefined,
  maxLength: number,
): string {
  const truncated =
    content.length > maxLength
      ? content.slice(0, maxLength) + "\n\n[Content truncated...]"
      : content;

  const titleLine = title ? `Title: ${title}\n\n` : "";
  return `${titleLine}Content:\n${truncated}`;
}

/**
 * Get the cheapest model for the active provider.
 * Falls back to the provider's configured model if no cheap model is known.
 */
function getCheapModel(router: ProviderRouter): {
  provider: LLMProviderName;
  model: string;
} {
  const activeProvider = router.getChatProvider();
  const cheapModel = CHEAP_MODELS[activeProvider.name];
  return {
    provider: activeProvider.name,
    model: cheapModel ?? router.getActiveChatModel(),
  };
}

/**
 * Parse the LLM response into a SummarizeResult.
 * Handles common LLM quirks like markdown code fences around JSON.
 */
function parseResponse(response: ChatResponse): SummarizeResult {
  let text = response.content.trim();

  // Strip markdown code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  const parsed: unknown = JSON.parse(text);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("summary" in parsed) ||
    !("tags" in parsed)
  ) {
    throw new Error("LLM response missing required fields: summary, tags");
  }

  const obj = parsed as { summary: unknown; tags: unknown };

  if (typeof obj.summary !== "string" || obj.summary.length === 0) {
    throw new Error("LLM response has invalid summary field");
  }

  if (!Array.isArray(obj.tags) || obj.tags.length === 0) {
    throw new Error("LLM response has invalid tags field");
  }

  const rawTags: Array<{ name: string; score: number }> = [];
  for (const tag of obj.tags) {
    if (
      typeof tag === "object" &&
      tag !== null &&
      "name" in tag &&
      typeof (tag as { name: unknown }).name === "string"
    ) {
      const t = tag as { name: string; score?: unknown };
      rawTags.push({
        name: t.name,
        score: typeof t.score === "number" ? t.score : 0.5,
      });
    }
  }

  if (rawTags.length === 0) {
    throw new Error("LLM response has no valid tags");
  }

  const normalizedTags = normalizeTags(rawTags);

  return {
    summary: obj.summary,
    tags: normalizedTags,
  };
}

/**
 * Auto-summarize content and generate topic tags using the configured LLM.
 *
 * Uses the cheapest available model for cost efficiency.
 * Returns null if the LLM call fails (graceful degradation).
 */
export async function summarizeAndTag(
  router: ProviderRouter,
  content: string,
  options?: SummarizerOptions & { title?: string },
): Promise<SummarizeResult | null> {
  const maxContentLength = options?.maxContentLength ?? 8000;

  if (!content.trim()) {
    return null;
  }

  const { model } = getCheapModel(router);
  const provider = router.getChatProvider();

  try {
    const response = await provider.chat({
      model,
      messages: [
        { role: "system", content: SUMMARIZE_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(content, options?.title, maxContentLength),
        },
      ],
      temperature: 0.3,
      maxTokens: 1024,
    });

    return parseResponse(response);
  } catch (error: unknown) {
    // Graceful degradation: log and return null
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[ai-pipeline] summarizeAndTag failed: ${message}`,
    );
    return null;
  }
}
