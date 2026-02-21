// @mixa-ai/ai-pipeline — Token counting using tiktoken

import { encodingForModel } from "js-tiktoken";

/** Cached encoder instance (cl100k_base, used by GPT-4 / text-embedding-3) */
let cachedEncoder: ReturnType<typeof encodingForModel> | undefined;

function getEncoder(): ReturnType<typeof encodingForModel> {
  if (!cachedEncoder) {
    cachedEncoder = encodingForModel("gpt-4o");
  }
  return cachedEncoder;
}

/** Count the number of tokens in a string using cl100k_base encoding */
export function countTokens(text: string): number {
  const encoder = getEncoder();
  return encoder.encode(text).length;
}

/** Encode text into token IDs */
export function encode(text: string): number[] {
  const encoder = getEncoder();
  return Array.from(encoder.encode(text));
}

/** Decode token IDs back into text */
export function decode(tokens: number[]): string {
  const encoder = getEncoder();
  return encoder.decode(tokens);
}
