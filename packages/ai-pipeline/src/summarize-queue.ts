// @mixa-ai/ai-pipeline — BullMQ summarize + tag job queue

import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";
import type { ProviderRouter } from "./providers/router.js";
import { summarizeAndTag } from "./summarizer.js";
import type { NormalizedTag } from "./tag-normalizer.js";

/** Name of the BullMQ queue for summarize+tag jobs */
export const SUMMARIZE_QUEUE_NAME = "mixa:summarize";

/** Data shape for a summarize+tag job */
export interface SummarizeJobData {
  /** The knowledge item ID (UUID) */
  itemId: string;
  /** The text content to summarize and tag */
  content: string;
  /** Optional title for context */
  title?: string;
}

/** Result returned when a summarize+tag job completes */
export interface SummarizeJobResult {
  /** The item ID that was processed */
  itemId: string;
  /** The generated summary, or null if summarization failed */
  summary: string | null;
  /** The generated tags with confidence scores */
  tags: NormalizedTag[];
}

/**
 * Create a BullMQ queue for summarize+tag jobs.
 * These jobs run after embedding jobs complete.
 */
export function createSummarizeQueue(
  connection: ConnectionOptions,
): Queue<SummarizeJobData, SummarizeJobResult> {
  return new Queue<SummarizeJobData, SummarizeJobResult>(
    SUMMARIZE_QUEUE_NAME,
    {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    },
  );
}

/**
 * Create a BullMQ worker that processes summarize+tag jobs.
 *
 * For each job:
 * 1. Send content to LLM for summarization + tag generation
 * 2. Normalize and deduplicate tags
 * 3. Return summary + tags (caller stores in DB)
 */
export function createSummarizeWorker(
  connection: ConnectionOptions,
  router: ProviderRouter,
  options?: {
    /** Called when a job completes successfully */
    onCompleted?: (
      job: Job<SummarizeJobData, SummarizeJobResult>,
      result: SummarizeJobResult,
    ) => Promise<void>;
    /** Called when a job fails after all retries */
    onFailed?: (
      job: Job<SummarizeJobData, SummarizeJobResult> | undefined,
      error: Error,
    ) => Promise<void>;
    /** Max concurrent jobs (default: 1, lower than embedding to avoid rate limits) */
    concurrency?: number;
  },
): Worker<SummarizeJobData, SummarizeJobResult> {
  const worker = new Worker<SummarizeJobData, SummarizeJobResult>(
    SUMMARIZE_QUEUE_NAME,
    async (job) => {
      const { itemId, content, title } = job.data;

      await job.updateProgress(10);

      const result = await summarizeAndTag(router, content, { title });

      await job.updateProgress(90);

      const jobResult: SummarizeJobResult = {
        itemId,
        summary: result?.summary ?? null,
        tags: result?.tags ?? [],
      };

      await job.updateProgress(100);
      return jobResult;
    },
    {
      connection,
      concurrency: options?.concurrency ?? 1,
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
 * Enqueue an item for summarization + tagging.
 * Typically called after an embedding job completes.
 */
export async function enqueueSummarizeJob(
  queue: Queue<SummarizeJobData, SummarizeJobResult>,
  data: SummarizeJobData,
): Promise<string> {
  const job = await queue.add(`summarize:${data.itemId}`, data, {
    jobId: `summarize:${data.itemId}`,
  });
  return job.id ?? data.itemId;
}
