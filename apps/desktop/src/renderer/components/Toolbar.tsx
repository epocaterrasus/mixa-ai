import { useCallback } from "react";
import { useTabStore } from "../stores/tabs";

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
  urlDisplay: {
    flex: 1,
    height: "26px",
    backgroundColor: "#1a1a1a",
    borderRadius: "6px",
    border: "1px solid #2a2a2a",
    color: "#ccc",
    fontSize: "12px",
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    marginLeft: "4px",
    marginRight: "4px",
  } as React.CSSProperties,
  urlText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  } as React.CSSProperties,
  lockIcon: {
    marginRight: "6px",
    fontSize: "10px",
    color: "#4ade80",
    flexShrink: 0,
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

  const isWebTab = activeTab?.type === "web";
  const url = activeTab?.url ?? "";
  const isHttps = url.startsWith("https://");

  // Clean display URL (remove protocol for display)
  const displayUrl = url.replace(/^https?:\/\//, "");

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
        ←
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
        →
      </button>
      <button
        type="button"
        style={styles.navButton}
        onClick={handleReload}
        disabled={!activeTab}
        aria-label="Reload page"
        title="Reload"
      >
        {activeTab?.state === "loading" ? "×" : "↻"}
      </button>

      {/* URL display */}
      <div style={styles.urlDisplay}>
        {isWebTab && url ? (
          <>
            {isHttps && <span style={styles.lockIcon}>🔒</span>}
            <span style={styles.urlText}>{displayUrl}</span>
          </>
        ) : isWebTab ? (
          <span style={{ ...styles.urlText, color: "#666" }}>New Tab</span>
        ) : (
          <span style={{ ...styles.urlText, color: "#666" }}>
            mixa://{activeTab?.type ?? "home"}
          </span>
        )}
      </div>
    </div>
  );
}
