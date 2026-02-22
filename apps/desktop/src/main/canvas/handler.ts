// Canvas persistence handler — save/load/list/delete canvas files
// Canvases are stored as JSON files in ~/.mixa/data/canvases/

import { ipcMain, dialog, BrowserWindow } from "electron";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  readFile,
  writeFile,
  readdir,
  unlink,
  mkdir,
} from "node:fs/promises";

/** Directory where canvas files are stored */
const CANVASES_DIR = join(homedir(), ".mixa", "data", "canvases");

/** Metadata about a saved canvas (returned by list) */
interface CanvasMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Ensure the canvases directory exists */
async function ensureDir(): Promise<void> {
  await mkdir(CANVASES_DIR, { recursive: true });
}

/** Parse canvas metadata from a saved JSON file */
function parseCanvasMeta(
  id: string,
  raw: string,
): CanvasMeta | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "name" in parsed &&
      "createdAt" in parsed &&
      "updatedAt" in parsed
    ) {
      const obj = parsed as Record<string, unknown>;
      return {
        id,
        name: typeof obj["name"] === "string" ? obj["name"] : "Untitled",
        createdAt: typeof obj["createdAt"] === "string" ? obj["createdAt"] : new Date().toISOString(),
        updatedAt: typeof obj["updatedAt"] === "string" ? obj["updatedAt"] : new Date().toISOString(),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function setupCanvasHandlers(): void {
  // Save canvas data to file
  ipcMain.handle(
    "canvas:save",
    async (_event, canvasId: string, data: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await ensureDir();
        const filePath = join(CANVASES_DIR, `${canvasId}.json`);
        await writeFile(filePath, data, "utf-8");
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to save canvas",
        };
      }
    },
  );

  // Load canvas data from file
  ipcMain.handle(
    "canvas:load",
    async (_event, canvasId: string): Promise<{ success: boolean; data?: string; error?: string }> => {
      try {
        await ensureDir();
        const filePath = join(CANVASES_DIR, `${canvasId}.json`);
        const data = await readFile(filePath, "utf-8");
        return { success: true, data };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to load canvas",
        };
      }
    },
  );

  // List all saved canvases
  ipcMain.handle(
    "canvas:list",
    async (): Promise<{ success: boolean; canvases?: CanvasMeta[]; error?: string }> => {
      try {
        await ensureDir();
        const files = await readdir(CANVASES_DIR);
        const canvases: CanvasMeta[] = [];

        for (const file of files) {
          if (!file.endsWith(".json")) continue;
          const id = file.replace(/\.json$/, "");
          try {
            const filePath = join(CANVASES_DIR, file);
            const raw = await readFile(filePath, "utf-8");
            const meta = parseCanvasMeta(id, raw);
            if (meta) {
              canvases.push(meta);
            }
          } catch {
            // skip unreadable files
          }
        }

        // Sort by updatedAt descending (most recent first)
        canvases.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

        return { success: true, canvases };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to list canvases",
        };
      }
    },
  );

  // Delete a canvas file
  ipcMain.handle(
    "canvas:delete",
    async (_event, canvasId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const filePath = join(CANVASES_DIR, `${canvasId}.json`);
        await unlink(filePath);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to delete canvas",
        };
      }
    },
  );

  // Export canvas to file (opens save dialog)
  ipcMain.handle(
    "canvas:export",
    async (
      _event,
      defaultName: string,
      format: string,
      data: string,
    ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
      try {
        const filters: Electron.FileFilter[] = [];
        if (format === "png") {
          filters.push({ name: "PNG Image", extensions: ["png"] });
        } else if (format === "svg") {
          filters.push({ name: "SVG Image", extensions: ["svg"] });
        } else {
          filters.push({ name: "Excalidraw JSON", extensions: ["excalidraw", "json"] });
        }

        const win = BrowserWindow.getFocusedWindow();
        const result = await dialog.showSaveDialog(win ?? BrowserWindow.getAllWindows()[0]!, {
          defaultPath: defaultName,
          filters,
        });

        if (result.canceled || !result.filePath) {
          return { success: false, error: "Export cancelled" };
        }

        if (format === "png") {
          // data is base64-encoded PNG
          const buffer = Buffer.from(data, "base64");
          await writeFile(result.filePath, buffer);
        } else {
          await writeFile(result.filePath, data, "utf-8");
        }

        return { success: true, filePath: result.filePath };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to export canvas",
        };
      }
    },
  );
}
