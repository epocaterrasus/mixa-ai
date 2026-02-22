// Canvas tab — Excalidraw visual workspace with auto-save, export, and tab embedding

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Excalidraw, exportToSvg, exportToBlob, serializeAsJSON, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles, BinaryFileData, DataURL } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
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

// ─── In-memory scene cache (survives unmount/remount cycles) ─────

interface CachedScene {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

interface SceneCacheEntry {
  elements: readonly ExcalidrawElement[];
  appState: Record<string, unknown>;
  files: BinaryFiles;
  name: string;
}

const sceneCache = new Map<string, SceneCacheEntry>();

// ─── Helpers ─────────────────────────────────────────────────────

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
  const lastSceneHashRef = useRef<string>("");

  // Refs for reliable unmount save (avoids stale closures)
  const latestSceneRef = useRef<CachedScene | null>(null);
  const canvasIdRef = useRef<string>("");
  const canvasNameRef = useRef<string>("Untitled Canvas");
  const createdAtRef = useRef<string>(new Date().toISOString());
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Tab store
  const activeTabId = useTabStore((s) => s.activeTabId);
  const updateTab = useTabStore((s) => s.updateTab);
  const activateTab = useTabStore((s) => s.activateTab);
  const addTab = useTabStore((s) => s.addTab);
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

  // All tabs except the current canvas tab are embeddable
  const embeddableTabs = useMemo(() => {
    return tabs.filter((t) => t.id !== activeTabId);
  }, [tabs, activeTabId]);

  // ─── Load via initialData (fed to Excalidraw on mount) ───────

  // Build the initial scene data for Excalidraw.
  // Checks in-memory cache first (instant after tab switch), then disk.
  const initialData = useMemo(() => {
    return async () => {
      function buildAppState(raw: Record<string, unknown>): Partial<AppState> {
        const out: Record<string, unknown> = { theme: resolvedMode };
        if (typeof raw["viewBackgroundColor"] === "string") {
          out["viewBackgroundColor"] = raw["viewBackgroundColor"];
        }
        if (typeof raw["gridSize"] === "number") {
          out["gridSize"] = raw["gridSize"];
        }
        return out as Partial<AppState>;
      }

      // In-memory cache (instant — no race with disk save)
      const cached = sceneCache.get(canvasId);
      if (cached) {
        setCanvasName(cached.name);
        setIsLoaded(true);
        return {
          elements: cached.elements as ExcalidrawElement[],
          appState: buildAppState(cached.appState),
          files: cached.files,
        };
      }

      // Disk fallback (first visit or cold start)
      try {
        const result = await window.electronAPI.canvas.load(canvasId);
        if (result.success && result.data) {
          const parsed: unknown = JSON.parse(result.data);
          if (typeof parsed === "object" && parsed !== null) {
            const data = parsed as Record<string, unknown>;
            const name = typeof data["name"] === "string" ? data["name"] : "Untitled Canvas";
            const elements = Array.isArray(data["elements"])
              ? data["elements"] as ExcalidrawElement[]
              : [];
            const rawAppState = typeof data["appState"] === "object" && data["appState"] !== null
              ? data["appState"] as Record<string, unknown>
              : {};
            const files = typeof data["files"] === "object" && data["files"] !== null
              ? data["files"] as BinaryFiles
              : {};

            if (typeof data["createdAt"] === "string") {
              createdAtRef.current = data["createdAt"];
            }

            setCanvasName(name);
            setIsLoaded(true);
            return { elements, appState: buildAppState(rawAppState), files };
          }
        }
      } catch (err) {
        console.warn("[canvas] Failed to load canvas from disk:", canvasId, err);
      }

      setIsLoaded(true);
      return null;
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

    // Dedup by scene content only (exclude volatile timestamps)
    const sceneHash = JSON.stringify({ elements, files });
    if (sceneHash === lastSceneHashRef.current) return;
    lastSceneHashRef.current = sceneHash;

    const saveData = buildSavePayload(
      canvasNameRef.current,
      createdAtRef.current,
      { elements, appState, files },
    );

    const dataStr = JSON.stringify(saveData);

    setIsSaving(true);
    try {
      const result = await window.electronAPI.canvas.save(canvasId, dataStr);
      if (result.success) {
        const now = new Date();
        setLastSaved(now);

        const meta = {
          id: canvasId,
          name: canvasNameRef.current,
          createdAt: saveData.createdAt,
          updatedAt: saveData.updatedAt,
        };
        updateSavedCanvas(canvasId, meta);
        addSavedCanvas(meta);
      } else {
        console.error("[canvas] Save failed:", result.error);
      }
    } catch (err) {
      console.error("[canvas] Save threw:", err);
    }
    setIsSaving(false);
  }, [canvasId, addSavedCanvas, updateSavedCanvas]);

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

  // Reliable unmount save: write to in-memory cache (sync) + disk (async)
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      const scene = latestSceneRef.current;
      if (!scene) return;

      // Write to in-memory cache synchronously so remount can restore instantly
      sceneCache.set(canvasIdRef.current, {
        elements: scene.elements,
        appState: {
          viewBackgroundColor: scene.appState.viewBackgroundColor,
          gridSize: scene.appState.gridSize,
          zoom: scene.appState.zoom,
          scrollX: scene.appState.scrollX,
          scrollY: scene.appState.scrollY,
        },
        files: scene.files,
        name: canvasNameRef.current,
      });

      // Also persist to disk in the background
      const payload = buildSavePayload(canvasNameRef.current, createdAtRef.current, scene);
      window.electronAPI.canvas.save(
        canvasIdRef.current,
        JSON.stringify(payload),
      ).catch((err: unknown) => {
        console.error("[canvas] Unmount save failed:", err);
      });
    };
    // Refs are stable — cleanup only needs to run on true unmount

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
    async (tabId: string, sceneX: number, sceneY: number) => {
      if (!excalidrawRef.current) return;

      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      const ts = Date.now();
      const fileId = `screenshot-${tabId}-${ts}` as FileId;
      const groupId = `group-embed-${tabId}-${ts}`;

      // Try to capture a screenshot from web/app tabs
      const isWebTab = tab.type === "web" || tab.type === "app";
      const dataURL = isWebTab
        ? await window.electronAPI.tabs.captureScreenshot(tabId)
        : null;

      const currentElements = excalidrawRef.current.getSceneElements();

      if (dataURL) {
        // Load the image to get its natural dimensions
        const img = new Image();
        const dimensions = await new Promise<{ w: number; h: number }>((resolve) => {
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: 640, h: 400 });
          img.src = dataURL;
        });

        const maxWidth = 640;
        const scale = dimensions.w > maxWidth ? maxWidth / dimensions.w : 1;
        const width = Math.round(dimensions.w * scale);
        const height = Math.round(dimensions.h * scale);

        const fileData: BinaryFileData = {
          mimeType: "image/png",
          id: fileId,
          dataURL: dataURL as DataURL,
          created: ts,
        };

        excalidrawRef.current.addFiles([fileData]);

        const imageElements = convertToExcalidrawElements(
          [
            {
              type: "image" as const,
              id: `embed-${tabId}-${ts}`,
              fileId,
              x: sceneX,
              y: sceneY,
              width,
              height,
              link: tab.url,
              groupIds: [groupId],
              customData: {
                embeddedTabId: tabId,
                embeddedTabUrl: tab.url,
                embeddedTabTitle: tab.title,
                embeddedTabType: tab.type,
                embedMode: "screenshot",
              },
            },
            {
              type: "text" as const,
              id: `embed-label-${tabId}-${ts}`,
              x: sceneX,
              y: sceneY + height + 8,
              text: tab.title,
              fontSize: 14,
              fontFamily: 1,
              textAlign: "left" as const,
              verticalAlign: "top" as const,
              strokeColor: resolvedMode === "dark" ? "#a5a5a5" : "#666666",
              groupIds: [groupId],
              customData: {
                embeddedTabId: tabId,
                isLabel: true,
              },
            },
          ],
          { regenerateIds: false },
        );

        excalidrawRef.current.updateScene({
          elements: [...currentElements, ...imageElements],
        });
      } else {
        // Fallback for non-web tabs: rectangle + title
        const fallbackElements = convertToExcalidrawElements(
          [
            {
              type: "rectangle",
              id: `embed-${tabId}-${ts}`,
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
              link: tab.url,
              groupIds: [groupId],
              customData: {
                embeddedTabId: tabId,
                embeddedTabUrl: tab.url,
                embeddedTabTitle: tab.title,
                embeddedTabType: tab.type,
                embedMode: "snapshot",
              },
            },
            {
              type: "text",
              id: `embed-label-${tabId}-${ts}`,
              x: sceneX + 10,
              y: sceneY + 10,
              width: 300,
              height: 30,
              text: `${tab.title}\n${descriptionForTab(tab.type, tab.url)}`,
              fontSize: 14,
              fontFamily: 1,
              textAlign: "left" as const,
              verticalAlign: "top" as const,
              strokeColor: resolvedMode === "dark" ? "#e0e0e0" : "#1a1a1a",
              groupIds: [groupId],
              customData: {
                embeddedTabId: tabId,
                isLabel: true,
              },
            },
          ],
          { regenerateIds: false },
        );

        excalidrawRef.current.updateScene({
          elements: [...currentElements, ...fallbackElements],
        });
      }
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
      void embedTabAtPosition(tabId, centerX, centerY);
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

        void embedTabAtPosition(id, sceneX, sceneY);
      } catch {
        // ignore malformed drop data
      }
    },
    [embedTabAtPosition],
  );

  // ─── Click-to-navigate for embedded tabs ────────────────────

  const handleLinkOpen = useCallback(
    (
      element: ExcalidrawElement,
      event: CustomEvent<{ nativeEvent: MouseEvent | React.PointerEvent<HTMLCanvasElement> }>,
    ) => {
      const embeddedTabId = (element.customData as Record<string, unknown> | undefined)?.["embeddedTabId"];
      if (typeof embeddedTabId === "string") {
        event.preventDefault();
        const tabExists = tabs.some((t) => t.id === embeddedTabId);
        if (tabExists) {
          activateTab(embeddedTabId);
        } else {
          // Tab was closed — open the URL in a new tab instead
          const url = element.link;
          if (url) {
            const newTabId = addTab("web", url);
            activateTab(newTabId);
          }
        }
      }
    },
    [tabs, activateTab, addTab],
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
          key={canvasId}
          initialData={initialData}
          excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
            excalidrawRef.current = api;
          }}
          theme={resolvedMode}
          onChange={handleChange}
          onLinkOpen={handleLinkOpen}
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
