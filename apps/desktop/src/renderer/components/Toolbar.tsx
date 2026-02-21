import { useCallback } from "react";
import { useTabStore } from "../stores/tabs";
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

  const isLoading = activeTab?.state === "loading";

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

      {/* Engine health indicator */}
      <EngineStatusIndicator />
    </div>
  );
}
