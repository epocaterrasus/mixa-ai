// Canvas tab — Excalidraw visual workspace with auto-save, export, and tab embedding

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Excalidraw, exportToSvg, exportToBlob, serializeAsJSON } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { useTabStore } from "../../stores/tabs";
import { useCanvasStore, generateCanvasId } from "../../stores/canvas";
import type { CanvasSaveData } from "../../stores/canvas";
import { useThemeStore } from "../../stores/theme";
import { CanvasToolbar } from "./CanvasToolbar";

// MIME type for sidebar tab drag-and-drop
const MIXA_TAB_MIME = "text/x-mixa-tab";

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

// ─── Helpers ─────────────────────────────────────────────────────

interface CachedScene {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

function buildSavePayload(
  name: string,
  createdIso: string,
  scene: CachedScene,
): CanvasSaveData {
  return {
    name,
    createdAt: createdIso,
    updatedAt: new Date().toISOString(),
    elements: scene.elements as unknown as readonly Record<string, unknown>[],
    appState: {
      viewBackgroundColor: scene.appState.viewBackgroundColor,
      gridSize: scene.appState.gridSize,
      zoom: scene.appState.zoom,
      scrollX: scene.appState.scrollX,
      scrollY: scene.appState.scrollY,
    },
    files: scene.files as unknown as Record<string, unknown>,
  };
}

function descriptionForTab(type: string, url: string | null): string {
  if ((type === "web" || type === "app") && url) return url;
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// ─── Component ───────────────────────────────────────────────────

export function CanvasTab(): React.ReactElement {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [canvasName, setCanvasName] = useState("Untitled Canvas");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveDataRef = useRef<string>("");

  // Refs for reliable unmount save (avoids stale closures)
  const latestSceneRef = useRef<CachedScene | null>(null);
  const canvasIdRef = useRef<string>("");
  const canvasNameRef = useRef<string>("Untitled Canvas");
  const lastSavedRef = useRef<Date | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Tab store
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

  // Keep refs in sync for unmount access
  canvasIdRef.current = canvasId;
  canvasNameRef.current = canvasName;
  lastSavedRef.current = lastSaved;

  // All tabs except the current canvas tab are embeddable
  const embeddableTabs = useMemo(() => {
    return tabs.filter((t) => t.id !== activeTabId);
  }, [tabs, activeTabId]);

  // ─── Load ────────────────────────────────────────────────────

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

  // ─── Save ────────────────────────────────────────────────────

  const saveCanvas = useCallback(async () => {
    if (!excalidrawRef.current) return;

    const elements = excalidrawRef.current.getSceneElements();
    const appState = excalidrawRef.current.getAppState();
    const files = excalidrawRef.current.getFiles();

    const saveData = buildSavePayload(
      canvasName,
      lastSaved ? lastSaved.toISOString() : new Date().toISOString(),
      { elements, appState, files },
    );

    const dataStr = JSON.stringify(saveData);
    if (dataStr === lastSaveDataRef.current) return;
    lastSaveDataRef.current = dataStr;

    setIsSaving(true);
    try {
      const result = await window.electronAPI.canvas.save(canvasId, dataStr);
      if (result.success) {
        const now = new Date();
        setLastSaved(now);

        const meta = {
          id: canvasId,
          name: canvasName,
          createdAt: saveData.createdAt,
          updatedAt: saveData.updatedAt,
        };
        updateSavedCanvas(canvasId, meta);
        addSavedCanvas(meta);
      }
    } catch {
      // ignore save errors silently
    }
    setIsSaving(false);
  }, [canvasId, canvasName, lastSaved, addSavedCanvas, updateSavedCanvas]);

  // Cache scene data on every change for reliable unmount save
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      latestSceneRef.current = { elements, appState, files };

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

  // Reliable unmount save using cached scene data (Excalidraw ref may be destroyed)
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      const scene = latestSceneRef.current;
      if (!scene) return;

      const created = lastSavedRef.current
        ? lastSavedRef.current.toISOString()
        : new Date().toISOString();

      const payload = buildSavePayload(canvasNameRef.current, created, scene);
      void window.electronAPI.canvas.save(
        canvasIdRef.current,
        JSON.stringify(payload),
      );
    };
    // Refs are stable — cleanup only needs to run on true unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Export ──────────────────────────────────────────────────

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

  // ─── Embed tab at scene coordinates ──────────────────────────

  const embedTabAtPosition = useCallback(
    (tabId: string, sceneX: number, sceneY: number) => {
      if (!excalidrawRef.current) return;

      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      const currentElements = excalidrawRef.current.getSceneElements();
      const ts = Date.now();

      const rectElement: Record<string, unknown> = {
        id: `embed-${tabId}-${ts}`,
        type: "rectangle",
        x: sceneX,
        y: sceneY,
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
          embeddedTabType: tab.type,
          embedMode: "snapshot",
        },
      };

      const labelElement: Record<string, unknown> = {
        id: `embed-label-${tabId}-${ts}`,
        type: "text",
        x: sceneX + 10,
        y: sceneY + 10,
        width: 300,
        height: 30,
        text: `${tab.title}\n${descriptionForTab(tab.type, tab.url)}`,
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
          rectElement as unknown as ExcalidrawElement,
          labelElement as unknown as ExcalidrawElement,
        ],
      });
    },
    [tabs, resolvedMode],
  );

  // Toolbar "Embed Tab" button — places at viewport center
  const handleEmbedTab = useCallback(
    (tabId: string) => {
      if (!excalidrawRef.current) return;
      const appState = excalidrawRef.current.getAppState();
      const centerX = -(appState.scrollX ?? 0) + 200;
      const centerY = -(appState.scrollY ?? 0) + 200;
      embedTabAtPosition(tabId, centerX, centerY);
    },
    [embedTabAtPosition],
  );

  // ─── Drag-and-drop from sidebar ─────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(MIXA_TAB_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const raw = e.dataTransfer.getData(MIXA_TAB_MIME);
      if (!raw) return;
      e.preventDefault();

      try {
        const { id } = JSON.parse(raw) as { id: string };
        if (!excalidrawRef.current || !wrapperRef.current) return;

        const appState = excalidrawRef.current.getAppState();
        const rect = wrapperRef.current.getBoundingClientRect();
        const zoom = typeof appState.zoom === "object" && appState.zoom !== null
          ? (appState.zoom as { value: number }).value
          : 1;

        // Convert screen coordinates → Excalidraw scene coordinates
        const sceneX = (e.clientX - rect.left) / zoom - (appState.scrollX ?? 0);
        const sceneY = (e.clientY - rect.top) / zoom - (appState.scrollY ?? 0);

        embedTabAtPosition(id, sceneX, sceneY);
      } catch {
        // ignore malformed drop data
      }
    },
    [embedTabAtPosition],
  );

  // ─── Keyboard save ──────────────────────────────────────────

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

  // ─── Render ─────────────────────────────────────────────────

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
      <div
        ref={wrapperRef}
        style={excalidrawWrapperStyle}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
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
