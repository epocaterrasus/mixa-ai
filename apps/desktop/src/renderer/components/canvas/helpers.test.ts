import { describe, it, expect, vi } from "vitest";
import {
  buildEmbedElement,
  buildEmbedLabel,
  parseCanvasData,
  extractSafeAppState,
  formatExportName,
  buildSaveData,
} from "./helpers";

// ─── buildEmbedElement ──────────────────────────────────────────

describe("buildEmbedElement", () => {
  it("creates a rectangle element with correct position offset", () => {
    const el = buildEmbedElement("tab-1", "Google", "https://google.com", 100, 50, "dark");

    expect(el["type"]).toBe("rectangle");
    expect(el["x"]).toBe(-100 + 200);
    expect(el["y"]).toBe(-50 + 200);
    expect(el["width"]).toBe(320);
    expect(el["height"]).toBe(200);
  });

  it("uses dark theme colors when theme is dark", () => {
    const el = buildEmbedElement("tab-1", "Google", "https://google.com", 0, 0, "dark");

    expect(el["strokeColor"]).toBe("#a5a5a5");
    expect(el["backgroundColor"]).toBe("#2a2a2a");
  });

  it("uses light theme colors when theme is light", () => {
    const el = buildEmbedElement("tab-1", "Google", "https://google.com", 0, 0, "light");

    expect(el["strokeColor"]).toBe("#333333");
    expect(el["backgroundColor"]).toBe("#f5f5f5");
  });

  it("stores tab metadata in customData", () => {
    const el = buildEmbedElement("tab-42", "My Tab", "https://example.com", 0, 0, "dark");
    const custom = el["customData"] as Record<string, unknown>;

    expect(custom["embeddedTabId"]).toBe("tab-42");
    expect(custom["embeddedTabTitle"]).toBe("My Tab");
    expect(custom["embeddedTabUrl"]).toBe("https://example.com");
    expect(custom["embedMode"]).toBe("snapshot");
  });

  it("handles null URL in customData", () => {
    const el = buildEmbedElement("tab-1", "Terminal", null, 0, 0, "dark");
    const custom = el["customData"] as Record<string, unknown>;

    expect(custom["embeddedTabUrl"]).toBeNull();
  });

  it("generates an id with embed prefix and tabId", () => {
    const el = buildEmbedElement("tab-1", "Test", null, 0, 0, "dark");
    expect((el["id"] as string).startsWith("embed-tab-1-")).toBe(true);
  });
});

// ─── buildEmbedLabel ────────────────────────────────────────────

describe("buildEmbedLabel", () => {
  it("creates a text element with title and URL", () => {
    const el = buildEmbedLabel("tab-1", "Google", "https://google.com", 100, 50, "dark");

    expect(el["type"]).toBe("text");
    expect(el["text"]).toBe("Google\nhttps://google.com");
  });

  it("positions label offset from scroll", () => {
    const el = buildEmbedLabel("tab-1", "Test", null, 100, 50, "dark");

    expect(el["x"]).toBe(-100 + 210);
    expect(el["y"]).toBe(-50 + 210);
  });

  it("uses dark theme stroke color", () => {
    const el = buildEmbedLabel("tab-1", "Test", null, 0, 0, "dark");
    expect(el["strokeColor"]).toBe("#e0e0e0");
  });

  it("uses light theme stroke color", () => {
    const el = buildEmbedLabel("tab-1", "Test", null, 0, 0, "light");
    expect(el["strokeColor"]).toBe("#1a1a1a");
  });

  it("handles null URL by appending empty string", () => {
    const el = buildEmbedLabel("tab-1", "Terminal", null, 0, 0, "dark");
    expect(el["text"]).toBe("Terminal\n");
  });

  it("stores tabId and isLabel flag in customData", () => {
    const el = buildEmbedLabel("tab-99", "Test", null, 0, 0, "dark");
    const custom = el["customData"] as Record<string, unknown>;

    expect(custom["embeddedTabId"]).toBe("tab-99");
    expect(custom["isLabel"]).toBe(true);
  });
});

// ─── parseCanvasData ────────────────────────────────────────────

describe("parseCanvasData", () => {
  it("parses valid canvas JSON", () => {
    const raw = JSON.stringify({
      name: "My Canvas",
      elements: [{ id: "el-1", type: "rectangle" }],
      appState: { viewBackgroundColor: "#fff" },
      files: { "file-1": { data: "base64..." } },
    });

    const result = parseCanvasData(raw);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("My Canvas");
    expect(result!.elements).toHaveLength(1);
    expect(result!.appState["viewBackgroundColor"]).toBe("#fff");
    expect(result!.files["file-1"]).toBeDefined();
  });

  it("defaults name to Untitled Canvas when missing", () => {
    const raw = JSON.stringify({ elements: [] });
    const result = parseCanvasData(raw);
    expect(result!.name).toBe("Untitled Canvas");
  });

  it("returns null for invalid JSON", () => {
    expect(parseCanvasData("not json")).toBeNull();
  });

  it("returns null for non-object JSON", () => {
    expect(parseCanvasData('"a string"')).toBeNull();
    expect(parseCanvasData("42")).toBeNull();
    expect(parseCanvasData("null")).toBeNull();
  });

  it("returns null when elements is not an array", () => {
    const raw = JSON.stringify({ name: "Test", elements: "not-array" });
    expect(parseCanvasData(raw)).toBeNull();
  });

  it("returns null when elements is missing", () => {
    const raw = JSON.stringify({ name: "Test" });
    expect(parseCanvasData(raw)).toBeNull();
  });

  it("defaults appState to empty object when missing", () => {
    const raw = JSON.stringify({ elements: [] });
    const result = parseCanvasData(raw);
    expect(result!.appState).toEqual({});
  });

  it("defaults files to empty object when missing", () => {
    const raw = JSON.stringify({ elements: [] });
    const result = parseCanvasData(raw);
    expect(result!.files).toEqual({});
  });

  it("defaults appState to empty object when not an object", () => {
    const raw = JSON.stringify({ elements: [], appState: "invalid" });
    const result = parseCanvasData(raw);
    expect(result!.appState).toEqual({});
  });
});

// ─── extractSafeAppState ────────────────────────────────────────

describe("extractSafeAppState", () => {
  it("includes theme from parameter", () => {
    const result = extractSafeAppState({}, "dark");
    expect(result["theme"]).toBe("dark");
  });

  it("extracts viewBackgroundColor when it is a string", () => {
    const result = extractSafeAppState({ viewBackgroundColor: "#ffffff" }, "light");
    expect(result["viewBackgroundColor"]).toBe("#ffffff");
  });

  it("excludes viewBackgroundColor when not a string", () => {
    const result = extractSafeAppState({ viewBackgroundColor: 123 }, "light");
    expect(result["viewBackgroundColor"]).toBeUndefined();
  });

  it("extracts gridSize when it is a number", () => {
    const result = extractSafeAppState({ gridSize: 20 }, "dark");
    expect(result["gridSize"]).toBe(20);
  });

  it("excludes gridSize when not a number", () => {
    const result = extractSafeAppState({ gridSize: "big" }, "dark");
    expect(result["gridSize"]).toBeUndefined();
  });

  it("ignores unknown keys", () => {
    const result = extractSafeAppState(
      { viewBackgroundColor: "#000", dangerousKey: true, zoom: { value: 1 } },
      "dark",
    );
    expect(Object.keys(result)).toEqual(["theme", "viewBackgroundColor"]);
  });

  it("returns only theme for empty appState", () => {
    const result = extractSafeAppState({}, "light");
    expect(result).toEqual({ theme: "light" });
  });
});

// ─── formatExportName ───────────────────────────────────────────

describe("formatExportName", () => {
  it("appends extension to canvas name", () => {
    expect(formatExportName("My Drawing", "png")).toBe("My Drawing.png");
  });

  it("uses 'canvas' as default when name is empty", () => {
    expect(formatExportName("", "svg")).toBe("canvas.svg");
  });

  it("works with excalidraw extension", () => {
    expect(formatExportName("Diagram", "excalidraw")).toBe("Diagram.excalidraw");
  });
});

// ─── buildSaveData ──────────────────────────────────────────────

describe("buildSaveData", () => {
  it("builds a complete save data structure", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));

    const result = buildSaveData(
      "Test Canvas",
      "2025-06-15T09:00:00Z",
      [{ id: "el-1", type: "rectangle" }],
      { viewBackgroundColor: "#fff", gridSize: 20, zoom: { value: 1 }, scrollX: 10, scrollY: 20 },
      { "file-1": { data: "base64" } },
    );

    expect(result.name).toBe("Test Canvas");
    expect(result.createdAt).toBe("2025-06-15T09:00:00Z");
    expect(result.updatedAt).toBe("2025-06-15T10:00:00.000Z");
    expect(result.elements).toHaveLength(1);
    expect(result.appState["viewBackgroundColor"]).toBe("#fff");
    expect(result.appState["gridSize"]).toBe(20);
    expect(result.appState["scrollX"]).toBe(10);
    expect(result.appState["scrollY"]).toBe(20);
    expect(result.files["file-1"]).toBeDefined();

    vi.useRealTimers();
  });

  it("preserves empty elements array", () => {
    const result = buildSaveData("Empty", "2025-01-01T00:00:00Z", [], {}, {});
    expect(result.elements).toEqual([]);
  });

  it("handles undefined appState values", () => {
    const result = buildSaveData("Test", "2025-01-01T00:00:00Z", [], {}, {});
    expect(result.appState["viewBackgroundColor"]).toBeUndefined();
    expect(result.appState["gridSize"]).toBeUndefined();
  });
});
