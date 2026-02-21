import { useState, useRef, useEffect, useCallback } from "react";
import { useFindBarStore } from "../stores/findBar";
import { useTabStore } from "../stores/tabs";

const styles = {
  container: {
    position: "absolute",
    top: 0,
    right: "16px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 8px",
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    borderTop: "none",
    borderRadius: "0 0 8px 8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    zIndex: 100,
  } as React.CSSProperties,
  input: {
    width: "200px",
    height: "26px",
    padding: "0 8px",
    backgroundColor: "#111",
    border: "1px solid #444",
    borderRadius: "4px",
    color: "#fafafa",
    fontSize: "12px",
    outline: "none",
    fontFamily: "inherit",
  } as React.CSSProperties,
  matchCount: {
    fontSize: "11px",
    color: "#888",
    whiteSpace: "nowrap",
    minWidth: "60px",
    textAlign: "center",
  } as React.CSSProperties,
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "transparent",
    color: "#888",
    cursor: "pointer",
    fontSize: "14px",
    padding: 0,
    flexShrink: 0,
  } as React.CSSProperties,
  buttonDisabled: {
    color: "#444",
    cursor: "default",
  } as React.CSSProperties,
} as const;

export function FindBar(): React.ReactElement | null {
  const isOpen = useFindBarStore((s) => s.isOpen);
  const activeMatchOrdinal = useFindBarStore((s) => s.activeMatchOrdinal);
  const totalMatches = useFindBarStore((s) => s.totalMatches);
  const closeFindBar = useFindBarStore((s) => s.close);
  const resetResult = useFindBarStore((s) => s.resetResult);

  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeTab = useTabStore((s) => {
    const id = s.activeTabId;
    return s.tabs.find((t) => t.id === id);
  });

  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Reset query when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  // Trigger find as the user types
  useEffect(() => {
    if (!isOpen || !activeTabId || activeTab?.type !== "web") return;

    if (query.length > 0) {
      void window.electronAPI.tabs.findInPage(activeTabId, query, true);
    } else {
      void window.electronAPI.tabs.stopFindInPage(activeTabId);
      resetResult();
    }
  }, [query, isOpen, activeTabId, activeTab?.type, resetResult]);

  const handleClose = useCallback(() => {
    if (activeTabId && activeTab?.type === "web") {
      void window.electronAPI.tabs.stopFindInPage(activeTabId);
    }
    closeFindBar();
  }, [activeTabId, activeTab?.type, closeFindBar]);

  const handleNext = useCallback(() => {
    if (activeTabId && query.length > 0) {
      void window.electronAPI.tabs.findInPage(activeTabId, query, true);
    }
  }, [activeTabId, query]);

  const handlePrevious = useCallback(() => {
    if (activeTabId && query.length > 0) {
      void window.electronAPI.tabs.findInPage(activeTabId, query, false);
    }
  }, [activeTabId, query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrevious();
        } else {
          handleNext();
        }
      }
    },
    [handleClose, handleNext, handlePrevious],
  );

  if (!isOpen || activeTab?.type !== "web") {
    return null;
  }

  const hasMatches = totalMatches > 0;
  const matchText =
    query.length === 0
      ? ""
      : hasMatches
        ? `${activeMatchOrdinal} of ${totalMatches}`
        : "No matches";

  return (
    <div style={styles.container} role="search" aria-label="Find in page">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in page"
        aria-label="Find in page"
        style={styles.input}
      />
      <span
        style={styles.matchCount as React.CSSProperties}
        aria-live="polite"
      >
        {matchText}
      </span>
      <button
        type="button"
        onClick={handlePrevious}
        disabled={!hasMatches}
        style={{
          ...styles.button,
          ...(hasMatches ? {} : styles.buttonDisabled),
        }}
        aria-label="Previous match"
        title="Previous (Shift+Enter)"
      >
        {"\u2191"}
      </button>
      <button
        type="button"
        onClick={handleNext}
        disabled={!hasMatches}
        style={{
          ...styles.button,
          ...(hasMatches ? {} : styles.buttonDisabled),
        }}
        aria-label="Next match"
        title="Next (Enter)"
      >
        {"\u2193"}
      </button>
      <button
        type="button"
        onClick={handleClose}
        style={styles.button}
        aria-label="Close find bar"
        title="Close (Escape)"
      >
        {"\u00D7"}
      </button>
    </div>
  );
}
