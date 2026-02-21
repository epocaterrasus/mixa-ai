// @mixa-ai/ai-pipeline — Text chunker with sentence-boundary awareness

import { countTokens } from "./tokenizer.js";

/** A single text chunk with metadata */
export interface TextChunk {
  /** The text content of this chunk */
  content: string;
  /** Zero-based index within the source document */
  index: number;
  /** Token count for this chunk */
  tokenCount: number;
}

/** Configuration for the chunker */
export interface ChunkerOptions {
  /** Target chunk size in tokens (default: 512) */
  targetTokens?: number;
  /** Overlap between chunks in tokens (default: 50) */
  overlapTokens?: number;
}

const DEFAULT_TARGET_TOKENS = 512;
const DEFAULT_OVERLAP_TOKENS = 50;

/**
 * Split text into semantically meaningful chunks.
 *
 * Strategy:
 * 1. Split into paragraphs (double newline boundaries)
 * 2. Accumulate paragraphs until reaching target token count
 * 3. If a single paragraph exceeds target, split on sentence boundaries
 * 4. Apply token overlap between consecutive chunks
 */
export function chunkText(
  text: string,
  options?: ChunkerOptions,
): TextChunk[] {
  const targetTokens = options?.targetTokens ?? DEFAULT_TARGET_TOKENS;
  const overlapTokens = options?.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  // If entire text fits in one chunk, return it as-is
  const totalTokens = countTokens(trimmed);
  if (totalTokens <= targetTokens) {
    return [{ content: trimmed, index: 0, tokenCount: totalTokens }];
  }

  // Split into paragraphs
  const paragraphs = splitParagraphs(trimmed);

  // Build chunks by accumulating paragraphs
  const rawChunks = buildChunksFromParagraphs(paragraphs, targetTokens);

  // Apply overlap between consecutive chunks
  const overlappedChunks = applyOverlap(rawChunks, overlapTokens);

  return overlappedChunks.map((content, i) => ({
    content,
    index: i,
    tokenCount: countTokens(content),
  }));
}

/** Split text into paragraphs (double newline or more) */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Split a paragraph into sentences */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end-of-string
  const sentences = text.match(/[^.!?]+[.!?]+[\s]?|[^.!?]+$/g);
  if (!sentences) {
    return [text];
  }
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Build chunks from paragraphs, splitting large paragraphs on sentence
 * boundaries when they exceed the target token count.
 */
function buildChunksFromParagraphs(
  paragraphs: string[],
  targetTokens: number,
): string[] {
  const chunks: string[] = [];
  let currentParts: string[] = [];
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paraTokens = countTokens(paragraph);

    // If paragraph alone exceeds target, split it into sentences
    if (paraTokens > targetTokens) {
      // Flush what we have
      if (currentParts.length > 0) {
        chunks.push(currentParts.join("\n\n"));
        currentParts = [];
        currentTokens = 0;
      }

      // Split the large paragraph into sentence-level chunks
      const sentenceChunks = buildChunksFromSentences(
        splitSentences(paragraph),
        targetTokens,
      );
      chunks.push(...sentenceChunks);
      continue;
    }

    // Would adding this paragraph exceed the target?
    if (currentTokens + paraTokens > targetTokens && currentParts.length > 0) {
      chunks.push(currentParts.join("\n\n"));
      currentParts = [];
      currentTokens = 0;
    }

    currentParts.push(paragraph);
    currentTokens += paraTokens;
  }

  // Flush remaining
  if (currentParts.length > 0) {
    chunks.push(currentParts.join("\n\n"));
  }

  return chunks;
}

/** Build chunks from sentences when a paragraph is too large */
function buildChunksFromSentences(
  sentences: string[],
  targetTokens: number,
): string[] {
  const chunks: string[] = [];
  let currentParts: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = countTokens(sentence);

    // If a single sentence exceeds the target, include it as its own chunk
    if (sentenceTokens > targetTokens) {
      if (currentParts.length > 0) {
        chunks.push(currentParts.join(" "));
        currentParts = [];
        currentTokens = 0;
      }
      chunks.push(sentence);
      continue;
    }

    if (currentTokens + sentenceTokens > targetTokens && currentParts.length > 0) {
      chunks.push(currentParts.join(" "));
      currentParts = [];
      currentTokens = 0;
    }

    currentParts.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (currentParts.length > 0) {
    chunks.push(currentParts.join(" "));
  }

  return chunks;
}

/**
 * Apply token overlap between consecutive chunks.
 * Takes trailing sentences from chunk N and prepends them to chunk N+1.
 */
function applyOverlap(chunks: string[], overlapTokens: number): string[] {
  if (chunks.length <= 1 || overlapTokens <= 0) {
    return chunks;
  }

  const result: string[] = [chunks[0]!];

  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = chunks[i - 1]!;
    const currentChunk = chunks[i]!;

    // Get trailing context from previous chunk
    const overlapText = getTrailingContext(prevChunk, overlapTokens);

    if (overlapText.length > 0) {
      result.push(overlapText + " " + currentChunk);
    } else {
      result.push(currentChunk);
    }
  }

  return result;
}

/**
 * Extract trailing sentences from text that fit within the token budget.
 * Used to create overlap context between chunks.
 */
function getTrailingContext(text: string, maxTokens: number): string {
  const sentences = splitSentences(text);
  const trailing: string[] = [];
  let tokens = 0;

  // Walk backwards through sentences
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentenceTokens = countTokens(sentences[i]!);
    if (tokens + sentenceTokens > maxTokens) {
      break;
    }
    trailing.unshift(sentences[i]!);
    tokens += sentenceTokens;
  }

  return trailing.join(" ");
}
