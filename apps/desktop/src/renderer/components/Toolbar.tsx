import { useCallback } from "react";
import { useTabStore } from "../stores/tabs";
import { useCaptureStore } from "../stores/capture";
import { Omnibar } from "./Omnibar";
import { EngineStatusIndicator } from "./EngineStatusIndicator";

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    height: "36px",
    backgroundColor: "var(--mixa-bg-surface)",
    borderBottom: "1px solid var(--mixa-border-default)",
    padding: "0 8px",
    gap: "4px",
  } as React.CSSProperties,
  navButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-muted)",
    cursor: "pointer",
    fontSize: "14px",
    padding: 0,
    flexShrink: 0,
  } as React.CSSProperties,
  navButtonDisabled: {
    color: "var(--mixa-text-faint)",
    cursor: "default",
  } as React.CSSProperties,
} as const;

export function Toolbar(): React.ReactElement {
  const activeTab = useTabStore((s) => {
    const id = s.activeTabId;
    return s.tabs.find((t) => t.id === id);
  });

  const handleGoBack = useCallback(() => {
    if (activeTab?.canGoBack) {
      void window.electronAPI.tabs.goBack(activeTab.id);
    }
  }, [activeTab]);

  const handleGoForward = useCallback(() => {
    if (activeTab?.canGoForward) {
      void window.electronAPI.tabs.goForward(activeTab.id);
    }
  }, [activeTab]);

  const handleReloadOrStop = useCallback(() => {
    if (!activeTab) return;
    if (activeTab.state === "loading") {
      void window.electronAPI.tabs.stop(activeTab.id);
    } else {
      void window.electronAPI.tabs.reload(activeTab.id);
    }
  }, [activeTab]);

  const isCapturing = useCaptureStore((s) => s.isCapturing);
  const addToast = useCaptureStore((s) => s.addToast);

  const handleCapture = useCallback(async () => {
    if (!activeTab || activeTab.type !== "web" || !activeTab.url) return;
    useCaptureStore.getState().setCapturing(true);
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
      addToast({ type: "error", title: "Capture failed", message });
    } finally {
      useCaptureStore.getState().setCapturing(false);
    }
  }, [activeTab, addToast]);

  const isLoading = activeTab?.state === "loading";
  const canCapture = activeTab?.type === "web" && !!activeTab.url && !isCapturing;

  return (
    <div style={styles.container}>
      {/* Navigation buttons */}
      <button
        type="button"
        style={{
          ...styles.navButton,
          ...(activeTab?.canGoBack ? {} : styles.navButtonDisabled),
        }}
        onClick={handleGoBack}
        disabled={!activeTab?.canGoBack}
        aria-label="Go back"
        title="Back (Cmd+[)"
      >
        {"\u2190"}
      </button>
      <button
        type="button"
        style={{
          ...styles.navButton,
          ...(activeTab?.canGoForward ? {} : styles.navButtonDisabled),
        }}
        onClick={handleGoForward}
        disabled={!activeTab?.canGoForward}
        aria-label="Go forward"
        title="Forward (Cmd+])"
      >
        {"\u2192"}
      </button>
      <button
        type="button"
        style={styles.navButton}
        onClick={handleReloadOrStop}
        disabled={!activeTab}
        aria-label={isLoading ? "Stop loading" : "Reload page"}
        title={isLoading ? "Stop (Esc)" : "Reload (Cmd+R)"}
      >
        {isLoading ? "\u00D7" : "\u21BB"}
      </button>

      {/* Omnibar (URL + command palette + search) */}
      <Omnibar />

      {/* Save to Mixa button */}
      <button
        type="button"
        style={{
          ...styles.navButton,
          ...(canCapture ? {} : styles.navButtonDisabled),
        }}
        onClick={() => void handleCapture()}
        disabled={!canCapture}
        aria-label="Save page to Mixa"
        title="Save to Mixa (Cmd+S)"
      >
        {isCapturing ? "\u22EF" : "\u2B07"}
      </button>

      {/* Engine health indicator */}
      <EngineStatusIndicator />
    </div>
  );
}
