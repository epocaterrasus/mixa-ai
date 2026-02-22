import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@mixa-ai/ui";
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
    padding: "8px 12px",
    backgroundColor: "var(--mixa-bg-elevated)",
    border: "1px solid var(--mixa-border-subtle)",
    borderTop: "none",
    borderRadius: "0 0 8px 8px",
    boxShadow: "var(--mixa-shadow-float)",
    zIndex: 100,
  } as React.CSSProperties,
  input: {
    width: "200px",
    height: "28px",
    padding: "0 8px",
    backgroundColor: "var(--mixa-bg-surface)",
    border: "1px solid var(--mixa-border-default)",
    borderRadius: "6px",
    color: "var(--mixa-text-primary)",
    fontSize: "13px",
    outline: "none",
    fontFamily: "inherit",
  } as React.CSSProperties,
  matchCount: {
    fontSize: "11px",
    color: "var(--mixa-text-muted)",
    whiteSpace: "nowrap",
    minWidth: "60px",
    textAlign: "center",
  } as React.CSSProperties,
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "26px",
    height: "26px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-muted)",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  } as React.CSSProperties,
  buttonDisabled: {
    color: "var(--mixa-text-faint)",
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

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

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
    if (activeTabId && (activeTab?.type === "web" || activeTab?.type === "app")) {
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
        <Icon name="up" size={14} />
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
        <Icon name="down" size={14} />
      </button>
      <button
        type="button"
        onClick={handleClose}
        style={styles.button}
        aria-label="Close find bar"
        title="Close (Escape)"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
