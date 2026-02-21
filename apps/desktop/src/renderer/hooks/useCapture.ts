import { useEffect, useCallback } from "react";
import { useTabStore } from "../stores/tabs";
import { useCaptureStore } from "../stores/capture";

/**
 * Hook that handles content capture:
 * - Cmd+S / Ctrl+S: Capture current web tab page
 * - Listens for capture completion events from context menu
 */
export function useCapture(): void {
  const addToast = useCaptureStore((s) => s.addToast);
  const setCapturing = useCaptureStore((s) => s.setCapturing);

  const captureCurrentTab = useCallback(async () => {
    const state = useTabStore.getState();
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);

    if (!activeTab || activeTab.type !== "web") return;
    if (!activeTab.url) {
      addToast({
        type: "error",
        title: "Cannot capture",
        message: "This tab has no URL to capture",
      });
      return;
    }

    setCapturing(true);
    try {
      const result = await window.electronAPI.capture.captureTab(
        activeTab.id,
        activeTab.faviconUrl,
      );

      if (result.success && result.data) {
        addToast({
          type: result.isDuplicate ? "duplicate" : "success",
          title: result.isDuplicate ? "Updated existing save" : "Saved to Mixa",
          message: result.data.title,
        });
      } else {
        addToast({
          type: "error",
          title: "Capture failed",
          message: result.error ?? "Unknown error",
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Capture failed";
      addToast({
        type: "error",
        title: "Capture failed",
        message,
      });
    } finally {
      setCapturing(false);
    }
  }, [addToast, setCapturing]);

  // Keyboard shortcut: Cmd+S to capture
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      // Cmd+S: Save current page to knowledge base
      if (e.key === "s" && !e.shiftKey && !e.altKey) {
        const state = useTabStore.getState();
        const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
        if (activeTab?.type === "web") {
          e.preventDefault();
          void captureCurrentTab();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [captureCurrentTab]);

  // Listen for capture completion events from context menu
  useEffect(() => {
    const unsubscribe = window.electronAPI.capture.onCompleted((data) => {
      if (data.success && data.data) {
        addToast({
          type: "success",
          title: data.type === "selection" ? "Selection saved" : "Saved to Mixa",
          message: data.data.title,
        });
      } else {
        addToast({
          type: "error",
          title: "Capture failed",
          message: data.error ?? "Unknown error",
        });
      }
    });

    return unsubscribe;
  }, [addToast]);
}
