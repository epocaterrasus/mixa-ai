import { useCallback } from "react";
import { useTabStore } from "../stores/tabs";
import { Omnibar } from "./Omnibar";

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    height: "36px",
    backgroundColor: "#111",
    borderBottom: "1px solid #2a2a2a",
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
    color: "#888",
    cursor: "pointer",
    fontSize: "14px",
    padding: 0,
    flexShrink: 0,
  } as React.CSSProperties,
  navButtonDisabled: {
    color: "#444",
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

  const handleReload = useCallback(() => {
    if (activeTab) {
      void window.electronAPI.tabs.reload(activeTab.id);
    }
  }, [activeTab]);

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
        title="Back"
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
        title="Forward"
      >
        {"\u2192"}
      </button>
      <button
        type="button"
        style={styles.navButton}
        onClick={handleReload}
        disabled={!activeTab}
        aria-label="Reload page"
        title="Reload"
      >
        {activeTab?.state === "loading" ? "\u00D7" : "\u21BB"}
      </button>

      {/* Omnibar (URL + command palette + search) */}
      <Omnibar />
    </div>
  );
}
