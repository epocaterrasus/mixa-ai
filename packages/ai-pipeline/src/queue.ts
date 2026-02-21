// @mixa-ai/ai-pipeline — BullMQ embedding job queue

import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";
import type { ProviderRouter } from "./providers/router.js";
import { chunkText, type ChunkerOptions } from "./chunker.js";
import { embedChunks } from "./embedder.js";

/** Name of the BullMQ queue for embedding jobs */
export const EMBEDDING_QUEUE_NAME = "mixa:embeddings";

/** Data shape for an embedding job */
export interface EmbeddingJobData {
  /** The knowledge item ID (UUID) */
  itemId: string;
  /** The text content to chunk and embed */
  content: string;
  /** Optional chunking options */
  chunkerOptions?: ChunkerOptions;
}

/** Result returned when an embedding job completes */
export interface EmbeddingJobResult {
  /** The item ID that was processed */
  itemId: string;
  /** Number of chunks generated */
  chunkCount: number;
  /** Array of chunk data with embeddings, ready for DB insertion */
  chunks: Array<{
    chunkIndex: number;
    content: string;
    tokenCount: number;
    embedding: number[];
  }>;
}

/**
 * Create a BullMQ queue for embedding jobs.
 * The queue is used to enqueue items that need to be chunked and embedded.
 */
export function createEmbeddingQueue(
  connection: ConnectionOptions,
): Queue<EmbeddingJobData, EmbeddingJobResult> {
  return new Queue<EmbeddingJobData, EmbeddingJobResult>(EMBEDDING_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
}

/**
 * Create a BullMQ worker that processes embedding jobs.
 *
 * For each job:
 * 1. Split content into chunks (respecting sentence boundaries)
 * 2. Generate embeddings via the configured provider
 * 3. Return chunk data with embeddings (caller stores in DB)
 */
export function createEmbeddingWorker(
  connection: ConnectionOptions,
  router: ProviderRouter,
  options?: {
    /** Called when a job completes successfully (e.g., to store results in DB) */
    onCompleted?: (job: Job<EmbeddingJobData, EmbeddingJobResult>, result: EmbeddingJobResult) => Promise<void>;
    /** Called when a job fails after all retries */
    onFailed?: (job: Job<EmbeddingJobData, EmbeddingJobResult> | undefined, error: Error) => Promise<void>;
    /** Max concurrent jobs (default: 2) */
    concurrency?: number;
  },
): Worker<EmbeddingJobData, EmbeddingJobResult> {
  const worker = new Worker<EmbeddingJobData, EmbeddingJobResult>(
    EMBEDDING_QUEUE_NAME,
    async (job) => {
      const { itemId, content, chunkerOptions } = job.data;

      // Step 1: Chunk the text
      await job.updateProgress(10);
      const chunks = chunkText(content, chunkerOptions);

      if (chunks.length === 0) {
        return { itemId, chunkCount: 0, chunks: [] };
      }

      // Step 2: Generate embeddings
      await job.updateProgress(30);
      const embedded = await embedChunks(router, chunks);
      await job.updateProgress(90);

      // Step 3: Return results for DB storage
      const result: EmbeddingJobResult = {
        itemId,
        chunkCount: embedded.length,
        chunks: embedded.map((ec) => ({
          chunkIndex: ec.chunk.index,
          content: ec.chunk.content,
          tokenCount: ec.chunk.tokenCount,
          embedding: ec.embedding,
        })),
      };

      await job.updateProgress(100);
      return result;
    },
    {
      connection,
      concurrency: options?.concurrency ?? 2,
    },
  );

  if (options?.onCompleted) {
    const onCompleted = options.onCompleted;
    worker.on("completed", (job, result) => {
      void onCompleted(job, result);
    });
  }

  if (options?.onFailed) {
    const onFailed = options.onFailed;
    worker.on("failed", (job, error) => {
      void onFailed(job, error);
    });
  }

  return worker;
}

/**
 * Enqueue an item for chunking + embedding.
 * This is the primary API for callers (e.g., content capture).
 */
export async function enqueueEmbeddingJob(
  queue: Queue<EmbeddingJobData, EmbeddingJobResult>,
  data: EmbeddingJobData,
): Promise<string> {
  const job = await queue.add(`embed:${data.itemId}`, data, {
    jobId: `embed:${data.itemId}`,
  });
  return job.id ?? data.itemId;
}
