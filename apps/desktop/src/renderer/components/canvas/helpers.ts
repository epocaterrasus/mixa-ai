// Pure helper functions for the Canvas tab
// Extracted for testability.

import type { CanvasSaveData } from "../../stores/canvas";

/** Theme mode type matching Excalidraw expectations */
export type ThemeMode = "dark" | "light";

/** Data parsed from a loaded canvas file */
export interface ParsedCanvasData {
  name: string;
  elements: readonly Record<string, unknown>[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
}

/** Build the rectangle element for embedding a tab on the canvas */
export function buildEmbedElement(
  tabId: string,
  tabTitle: string,
  tabUrl: string | null,
  scrollX: number,
  scrollY: number,
  theme: ThemeMode,
): Record<string, unknown> {
  return {
    id: `embed-${tabId}-${Date.now()}`,
    type: "rectangle",
    x: scrollX * -1 + 200,
    y: scrollY * -1 + 200,
    width: 320,
    height: 200,
    strokeColor: theme === "dark" ? "#a5a5a5" : "#333333",
    backgroundColor: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
    fillStyle: "solid",
    strokeWidth: 2,
    roughness: 0,
    roundness: { type: 3 },
    customData: {
      embeddedTabId: tabId,
      embeddedTabUrl: tabUrl,
      embeddedTabTitle: tabTitle,
      embedMode: "snapshot",
    },
  };
}

/** Build the text label element for an embedded tab */
export function buildEmbedLabel(
  tabId: string,
  tabTitle: string,
  tabUrl: string | null,
  scrollX: number,
  scrollY: number,
  theme: ThemeMode,
): Record<string, unknown> {
  return {
    id: `embed-label-${tabId}-${Date.now()}`,
    type: "text",
    x: scrollX * -1 + 210,
    y: scrollY * -1 + 210,
    width: 300,
    height: 30,
    text: `${tabTitle}\n${tabUrl ?? ""}`,
    fontSize: 14,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
    strokeColor: theme === "dark" ? "#e0e0e0" : "#1a1a1a",
    customData: {
      embeddedTabId: tabId,
      isLabel: true,
    },
  };
}

/** Parse raw canvas JSON into structured data, returning null if invalid */
export function parseCanvasData(raw: string): ParsedCanvasData | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const data = parsed as Record<string, unknown>;
    const name = typeof data["name"] === "string" ? data["name"] : "Untitled Canvas";

    if (!Array.isArray(data["elements"])) return null;

    const appState =
      typeof data["appState"] === "object" && data["appState"] !== null
        ? (data["appState"] as Record<string, unknown>)
        : {};

    const files =
      typeof data["files"] === "object" && data["files"] !== null
        ? (data["files"] as Record<string, unknown>)
        : {};

    return {
      name,
      elements: data["elements"] as readonly Record<string, unknown>[],
      appState,
      files,
    };
  } catch {
    return null;
  }
}

/** Extract only safe appState keys for scene restoration */
export function extractSafeAppState(
  rawAppState: Record<string, unknown>,
  theme: ThemeMode,
): Record<string, unknown> {
  const safe: Record<string, unknown> = { theme };

  if (typeof rawAppState["viewBackgroundColor"] === "string") {
    safe["viewBackgroundColor"] = rawAppState["viewBackgroundColor"];
  }
  if (typeof rawAppState["gridSize"] === "number") {
    safe["gridSize"] = rawAppState["gridSize"];
  }

  return safe;
}

/** Build an export filename with the given extension */
export function formatExportName(canvasName: string, ext: string): string {
  return `${canvasName || "canvas"}.${ext}`;
}

/** Build save data structure for canvas persistence */
export function buildSaveData(
  name: string,
  createdAt: string,
  elements: readonly Record<string, unknown>[],
  appState: {
    viewBackgroundColor?: string;
    gridSize?: number | null;
    zoom?: unknown;
    scrollX?: number;
    scrollY?: number;
  },
  files: Record<string, unknown>,
): CanvasSaveData {
  return {
    name,
    createdAt,
    updatedAt: new Date().toISOString(),
    elements,
    appState: {
      viewBackgroundColor: appState.viewBackgroundColor,
      gridSize: appState.gridSize,
      zoom: appState.zoom,
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
    },
    files,
  };
}
