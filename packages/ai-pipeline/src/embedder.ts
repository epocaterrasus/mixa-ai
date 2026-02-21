// @mixa-ai/ai-pipeline — Embedding generation using configured LLM provider

import type { ProviderRouter } from "./providers/router.js";
import type { TextChunk } from "./chunker.js";

/** Result of embedding a single chunk */
export interface EmbeddedChunk {
  /** The original chunk */
  chunk: TextChunk;
  /** The embedding vector */
  embedding: number[];
}

/** Options for embedding generation */
export interface EmbedderOptions {
  /** Max chunks to embed in a single batch request (default: 20) */
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 20;

/**
 * Generate embeddings for an array of text chunks using the configured
 * embedding provider from the ProviderRouter.
 *
 * Processes chunks in batches to respect API rate limits and payload sizes.
 */
export async function embedChunks(
  router: ProviderRouter,
  chunks: TextChunk[],
  options?: EmbedderOptions,
): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) {
    return [];
  }

  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
  const provider = router.getEmbeddingProvider();
  const model = router.getEmbeddingModel();

  const results: EmbeddedChunk[] = [];

  // Process in batches
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.content);

    const response = await provider.embed({ model, input: texts });

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j]!;
      const embedding = response.embeddings[j];
      if (!embedding) {
        throw new Error(
          `Embedding response missing for chunk index ${chunk.index}`,
        );
      }
      results.push({ chunk, embedding });
    }
  }

  return results;
}
