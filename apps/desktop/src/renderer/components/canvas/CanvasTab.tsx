// Canvas tab — Excalidraw visual workspace with auto-save, export, and tab embedding

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Excalidraw, exportToSvg, exportToBlob, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { useTabStore } from "../../stores/tabs";
import { useCanvasStore, generateCanvasId } from "../../stores/canvas";
import type { CanvasSaveData } from "../../stores/canvas";
import { useThemeStore } from "../../stores/theme";
import { CanvasToolbar } from "./CanvasToolbar";

// ─── Styles ──────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: "var(--mixa-bg-base)",
  color: "var(--mixa-text-primary)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  overflow: "hidden",
};

const excalidrawWrapperStyle: React.CSSProperties = {
  flex: 1,
  position: "relative",
  overflow: "hidden",
};

// ─── Component ───────────────────────────────────────────────────

export function CanvasTab(): React.ReactElement {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [canvasName, setCanvasName] = useState("Untitled Canvas");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveDataRef = useRef<string>("");

  // Get active tab ID to associate this canvas instance
  const activeTabId = useTabStore((s) => s.activeTabId);
  const updateTab = useTabStore((s) => s.updateTab);
  const tabs = useTabStore((s) => s.tabs);

  // Canvas store
  const assignCanvas = useCanvasStore((s) => s.assignCanvas);
  const getCanvasId = useCanvasStore((s) => s.getCanvasId);
  const addSavedCanvas = useCanvasStore((s) => s.addSavedCanvas);
  const updateSavedCanvas = useCanvasStore((s) => s.updateSavedCanvas);

  // Theme
  const resolvedMode = useThemeStore((s) => s.resolvedMode);

  // Get or create canvas ID for this tab
  const canvasId = useMemo(() => {
    if (!activeTabId) return generateCanvasId();
    const existing = getCanvasId(activeTabId);
    if (existing) return existing;
    const newId = generateCanvasId();
    assignCanvas(activeTabId, newId);
    return newId;
  }, [activeTabId, getCanvasId, assignCanvas]);

  // Available tabs for embedding
  const embeddableTabs = useMemo(() => {
    return tabs.filter((t) => t.type === "web" || t.type === "app");
  }, [tabs]);

  // Load canvas data on mount
  useEffect(() => {
    let cancelled = false;

    async function loadCanvas(): Promise<void> {
      try {
        const result = await window.electronAPI.canvas.load(canvasId);
        if (cancelled) return;

        if (result.success && result.data) {
          const parsed: unknown = JSON.parse(result.data);
          if (typeof parsed === "object" && parsed !== null) {
            const data = parsed as Record<string, unknown>;
            const name = typeof data["name"] === "string" ? data["name"] : "Untitled Canvas";
            setCanvasName(name);

            if (excalidrawRef.current && Array.isArray(data["elements"])) {
              const elements = data["elements"] as readonly ExcalidrawElement[];
              const rawAppState = typeof data["appState"] === "object" && data["appState"] !== null
                ? data["appState"] as Record<string, unknown>
                : {};
              const files = typeof data["files"] === "object" && data["files"] !== null
                ? data["files"] as BinaryFiles
                : {};

              // Only restore safe appState keys to avoid type conflicts
              const restoredAppState: Record<string, unknown> = { theme: resolvedMode };
              if (typeof rawAppState["viewBackgroundColor"] === "string") {
                restoredAppState["viewBackgroundColor"] = rawAppState["viewBackgroundColor"];
              }
              if (typeof rawAppState["gridSize"] === "number") {
                restoredAppState["gridSize"] = rawAppState["gridSize"];
              }

              excalidrawRef.current.updateScene({
                elements,
                appState: restoredAppState as unknown as AppState,
              });
              excalidrawRef.current.addFiles(Object.values(files));
            }
          }
        }
      } catch {
        // New canvas — nothing to load
      }
      if (!cancelled) {
        setIsLoaded(true);
      }
    }

    void loadCanvas();
    return () => {
      cancelled = true;
    };
  }, [canvasId, resolvedMode]);

  // Update tab title when canvas name changes
  useEffect(() => {
    if (activeTabId) {
      updateTab(activeTabId, { title: canvasName || "Canvas" });
    }
  }, [activeTabId, canvasName, updateTab]);

  // Save canvas data
  const saveCanvas = useCallback(async () => {
    if (!excalidrawRef.current) return;

    const elements = excalidrawRef.current.getSceneElements();
    const appState = excalidrawRef.current.getAppState();
    const files = excalidrawRef.current.getFiles();

    const saveData: CanvasSaveData = {
      name: canvasName,
      createdAt: lastSaved ? lastSaved.toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elements: elements as unknown as readonly Record<string, unknown>[],
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        gridSize: appState.gridSize,
        zoom: appState.zoom,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
      },
      files: files as unknown as Record<string, unknown>,
    };

    const dataStr = JSON.stringify(saveData);

    // Skip if data hasn't changed
    if (dataStr === lastSaveDataRef.current) return;
    lastSaveDataRef.current = dataStr;

    setIsSaving(true);
    try {
      const result = await window.electronAPI.canvas.save(canvasId, dataStr);
      if (result.success) {
        const now = new Date();
        setLastSaved(now);

        // Update canvas list metadata
        const meta = {
          id: canvasId,
          name: canvasName,
          createdAt: saveData.createdAt,
          updatedAt: saveData.updatedAt,
        };
        updateSavedCanvas(canvasId, meta);
        // If first save, add to list
        addSavedCanvas(meta);
      }
    } catch {
      // ignore save errors silently
    }
    setIsSaving(false);
  }, [canvasId, canvasName, lastSaved, addSavedCanvas, updateSavedCanvas]);

  // Auto-save on changes (debounced 2 seconds)
  const handleChange = useCallback(
    (_elements: readonly ExcalidrawElement[], _appState: AppState, _files: BinaryFiles) => {
      if (!isLoaded) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void saveCanvas();
      }, 2000);
    },
    [isLoaded, saveCanvas],
  );

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Final save on unmount
      void saveCanvas();
    };
  }, [saveCanvas]);

  // Export handlers
  const handleExportPNG = useCallback(async () => {
    if (!excalidrawRef.current) return;

    const elements = excalidrawRef.current.getSceneElements();
    const appState = excalidrawRef.current.getAppState();
    const files = excalidrawRef.current.getFiles();

    try {
      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportWithDarkMode: resolvedMode === "dark" },
        files,
        mimeType: "image/png",
      });

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        if (base64) {
          void window.electronAPI.canvas.exportFile(
            `${canvasName || "canvas"}.png`,
            "png",
            base64,
          );
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      // ignore export errors
    }
  }, [canvasName, resolvedMode]);

  const handleExportSVG = useCallback(async () => {
    if (!excalidrawRef.current) return;

    const elements = excalidrawRef.current.getSceneElements();
    const appState = excalidrawRef.current.getAppState();
    const files = excalidrawRef.current.getFiles();

    try {
      const svg = await exportToSvg({
        elements,
        appState: { ...appState, exportWithDarkMode: resolvedMode === "dark" },
        files,
      });

      const svgString = new XMLSerializer().serializeToString(svg);
      void window.electronAPI.canvas.exportFile(
        `${canvasName || "canvas"}.svg`,
        "svg",
        svgString,
      );
    } catch {
      // ignore export errors
    }
  }, [canvasName, resolvedMode]);

  const handleExportJSON = useCallback(() => {
    if (!excalidrawRef.current) return;

    const elements = excalidrawRef.current.getSceneElements();
    const appState = excalidrawRef.current.getAppState();
    const files = excalidrawRef.current.getFiles();

    try {
      const json = serializeAsJSON(elements, appState, files, "local");
      void window.electronAPI.canvas.exportFile(
        `${canvasName || "canvas"}.excalidraw`,
        "json",
        json,
      );
    } catch {
      // ignore export errors
    }
  }, [canvasName]);

  // Embed tab as a labeled element
  const handleEmbedTab = useCallback(
    (tabId: string) => {
      if (!excalidrawRef.current) return;

      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      const currentElements = excalidrawRef.current.getSceneElements();
      const appState = excalidrawRef.current.getAppState();

      // Create a frame-like rectangle with the tab title
      const newElement: Record<string, unknown> = {
        id: `embed-${tabId}-${Date.now()}`,
        type: "rectangle",
        x: (appState.scrollX ?? 0) * -1 + 200,
        y: (appState.scrollY ?? 0) * -1 + 200,
        width: 320,
        height: 200,
        strokeColor: resolvedMode === "dark" ? "#a5a5a5" : "#333333",
        backgroundColor: resolvedMode === "dark" ? "#2a2a2a" : "#f5f5f5",
        fillStyle: "solid",
        strokeWidth: 2,
        roughness: 0,
        roundness: { type: 3 },
        customData: {
          embeddedTabId: tabId,
          embeddedTabUrl: tab.url,
          embeddedTabTitle: tab.title,
          embedMode: "snapshot",
        },
      };

      // Add a text label for the tab
      const labelElement: Record<string, unknown> = {
        id: `embed-label-${tabId}-${Date.now()}`,
        type: "text",
        x: (appState.scrollX ?? 0) * -1 + 210,
        y: (appState.scrollY ?? 0) * -1 + 210,
        width: 300,
        height: 30,
        text: `${tab.title}\n${tab.url ?? ""}`,
        fontSize: 14,
        fontFamily: 1,
        textAlign: "left",
        verticalAlign: "top",
        strokeColor: resolvedMode === "dark" ? "#e0e0e0" : "#1a1a1a",
        customData: {
          embeddedTabId: tabId,
          isLabel: true,
        },
      };

      excalidrawRef.current.updateScene({
        elements: [
          ...currentElements,
          newElement as unknown as ExcalidrawElement,
          labelElement as unknown as ExcalidrawElement,
        ],
      });
    },
    [tabs, resolvedMode],
  );

  // Save on Cmd+S
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        void saveCanvas();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveCanvas]);

  return (
    <div style={containerStyle}>
      <CanvasToolbar
        canvasName={canvasName}
        onNameChange={setCanvasName}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onSave={() => void saveCanvas()}
        onExportPNG={() => void handleExportPNG()}
        onExportSVG={() => void handleExportSVG()}
        onExportJSON={handleExportJSON}
        embeddableTabs={embeddableTabs}
        onEmbedTab={handleEmbedTab}
      />
      <div style={excalidrawWrapperStyle}>
        <Excalidraw
          excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
            excalidrawRef.current = api;
          }}
          theme={resolvedMode}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: false,
              saveAsImage: false,
            },
          }}
        />
      </div>
    </div>
  );
}
