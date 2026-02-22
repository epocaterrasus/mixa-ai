import { z } from "zod";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { router, publicProcedure } from "../trpc.js";

// --- Canvas data directory ---

const CANVASES_DIR = join(homedir(), ".mixa", "data", "canvases");

function ensureCanvasDir(): void {
  if (!existsSync(CANVASES_DIR)) {
    mkdirSync(CANVASES_DIR, { recursive: true });
  }
}

function canvasPath(id: string): string {
  return join(CANVASES_DIR, `${id}.json`);
}

// --- Canvas data shape ---

export interface CanvasMetadata {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasFile extends CanvasMetadata {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
}

function readCanvasFile(id: string): CanvasFile | null {
  const filePath = canvasPath(id);
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as CanvasFile;
  } catch {
    return null;
  }
}

function writeCanvasFile(canvas: CanvasFile): void {
  ensureCanvasDir();
  writeFileSync(canvasPath(canvas.id), JSON.stringify(canvas), "utf-8");
}

// --- tRPC Router ---

export const canvasRouter = router({
  /** List all canvases (metadata only) */
  list: publicProcedure.query(async (): Promise<CanvasMetadata[]> => {
    ensureCanvasDir();
    const files = readdirSync(CANVASES_DIR).filter((f) => f.endsWith(".json"));
    const canvases: CanvasMetadata[] = [];

    for (const file of files) {
      try {
        const raw = readFileSync(join(CANVASES_DIR, file), "utf-8");
        const parsed = JSON.parse(raw) as CanvasFile;
        canvases.push({
          id: parsed.id,
          title: parsed.title,
          createdAt: parsed.createdAt,
          updatedAt: parsed.updatedAt,
        });
      } catch {
        // Skip corrupted files
      }
    }

    // Sort by most recently updated
    canvases.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return canvases;
  }),

  /** Get a canvas by ID (full data) */
  get: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }): Promise<CanvasFile | null> => {
      return readCanvasFile(input.id);
    }),

  /** Create a new empty canvas */
  create: publicProcedure
    .input(z.object({ title: z.string().min(1).optional() }))
    .mutation(async ({ input }): Promise<CanvasMetadata> => {
      const id = `canvas-${Date.now()}`;
      const now = new Date().toISOString();
      const canvas: CanvasFile = {
        id,
        title: input.title ?? "Untitled Canvas",
        createdAt: now,
        updatedAt: now,
        elements: [],
        appState: {},
        files: {},
      };
      writeCanvasFile(canvas);
      return { id, title: canvas.title, createdAt: now, updatedAt: now };
    }),

  /** Save canvas data (elements, appState, files) */
  save: publicProcedure
    .input(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1).optional(),
        elements: z.array(z.unknown()),
        appState: z.record(z.unknown()),
        files: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      const existing = readCanvasFile(input.id);
      if (!existing) {
        return { success: false };
      }

      const updated: CanvasFile = {
        ...existing,
        title: input.title ?? existing.title,
        updatedAt: new Date().toISOString(),
        elements: input.elements,
        appState: input.appState,
        files: input.files,
      };
      writeCanvasFile(updated);
      return { success: true };
    }),

  /** Rename a canvas */
  rename: publicProcedure
    .input(z.object({ id: z.string().min(1), title: z.string().min(1) }))
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      const existing = readCanvasFile(input.id);
      if (!existing) return { success: false };

      existing.title = input.title;
      existing.updatedAt = new Date().toISOString();
      writeCanvasFile(existing);
      return { success: true };
    }),

  /** Delete a canvas */
  delete: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      const filePath = canvasPath(input.id);
      if (!existsSync(filePath)) return { success: false };
      unlinkSync(filePath);
      return { success: true };
    }),
});
