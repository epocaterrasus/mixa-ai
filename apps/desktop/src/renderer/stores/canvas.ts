// Canvas store — Zustand state management for canvas tabs
// Each canvas tab has its own Excalidraw instance; this store tracks
// saved canvases metadata and per-tab canvas IDs.

import { create } from "zustand";

/** Metadata for a saved canvas (mirrors what the main process returns) */
export interface CanvasMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Data structure saved to disk for each canvas */
export interface CanvasSaveData {
  name: string;
  createdAt: string;
  updatedAt: string;
  elements: readonly Record<string, unknown>[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
}

interface CanvasStore {
  /** Map from tab ID to canvas ID (one canvas per tab) */
  tabCanvasMap: Record<string, string>;
  /** Cached list of saved canvases */
  savedCanvases: CanvasMeta[];
  /** Whether the canvas list has been loaded */
  listLoaded: boolean;

  // Actions
  assignCanvas: (tabId: string, canvasId: string) => void;
  removeTabCanvas: (tabId: string) => void;
  getCanvasId: (tabId: string) => string | undefined;
  setSavedCanvases: (canvases: CanvasMeta[]) => void;
  addSavedCanvas: (meta: CanvasMeta) => void;
  removeSavedCanvas: (canvasId: string) => void;
  updateSavedCanvas: (canvasId: string, updates: Partial<CanvasMeta>) => void;
  loadCanvasList: () => Promise<void>;
}

let canvasCounter = 0;

export function generateCanvasId(): string {
  canvasCounter += 1;
  return `canvas-${Date.now()}-${canvasCounter}`;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  tabCanvasMap: {},
  savedCanvases: [],
  listLoaded: false,

  assignCanvas: (tabId, canvasId) => {
    set((state) => ({
      tabCanvasMap: { ...state.tabCanvasMap, [tabId]: canvasId },
    }));
  },

  removeTabCanvas: (tabId) => {
    set((state) => {
      const { [tabId]: _, ...rest } = state.tabCanvasMap;
      return { tabCanvasMap: rest };
    });
  },

  getCanvasId: (tabId) => {
    return get().tabCanvasMap[tabId];
  },

  setSavedCanvases: (canvases) => {
    set({ savedCanvases: canvases, listLoaded: true });
  },

  addSavedCanvas: (meta) => {
    set((state) => ({
      savedCanvases: [meta, ...state.savedCanvases],
    }));
  },

  removeSavedCanvas: (canvasId) => {
    set((state) => ({
      savedCanvases: state.savedCanvases.filter((c) => c.id !== canvasId),
    }));
  },

  updateSavedCanvas: (canvasId, updates) => {
    set((state) => ({
      savedCanvases: state.savedCanvases.map((c) =>
        c.id === canvasId ? { ...c, ...updates } : c,
      ),
    }));
  },

  loadCanvasList: async () => {
    try {
      const result = await window.electronAPI.canvas.list();
      if (result.success && result.canvases) {
        set({ savedCanvases: result.canvases, listLoaded: true });
      }
    } catch {
      // ignore — list will remain empty
    }
  },
}));
