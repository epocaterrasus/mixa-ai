import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useTabStore } from "../stores/tabs";
import { useHistoryStore } from "../stores/history";
import type { TabType } from "@mixa-ai/types";

// --- Types ---

type SuggestionKind = "tab" | "command" | "url" | "search" | "history";

interface Suggestion {
  id: string;
  kind: SuggestionKind;
  label: string;
  description: string;
  icon: string;
  /** For tab suggestions, the tab id to activate */
  tabId?: string;
  /** For history suggestions, the full URL to navigate to */
  url?: string;
  /** For command suggestions, the action to execute */
  action?: () => void;
}

// --- Helpers ---

function isLikelyUrl(input: string): boolean {
  // Starts with protocol
  if (/^https?:\/\//i.test(input)) return true;
  // Has a dot and no spaces (e.g. "google.com", "localhost:3000")
  if (/^[^\s]+\.[^\s]+$/.test(input)) return true;
  // localhost with optional port
  if (/^localhost(:\d+)?/i.test(input)) return true;
  return false;
}

function ensureUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) return input;
  if (/^localhost(:\d+)?/i.test(input)) return `http://${input}`;
  return `https://${input}`;
}

function searchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

// --- Styles ---

const styles = {
  wrapper: {
    position: "relative",
    flex: 1,
    marginLeft: "4px",
    marginRight: "4px",
  } as React.CSSProperties,

  display: {
    height: "26px",
    backgroundColor: "var(--mixa-bg-elevated)",
    borderRadius: "6px",
    border: "1px solid var(--mixa-border-default)",
    color: "var(--mixa-text-secondary)",
    fontSize: "12px",
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    cursor: "text",
  } as React.CSSProperties,

  displayFocused: {
    border: "1px solid var(--mixa-border-focus)",
    backgroundColor: "var(--mixa-bg-hover)",
  } as React.CSSProperties,

  input: {
    flex: 1,
    height: "100%",
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-primary)",
    fontSize: "12px",
    fontFamily: "inherit",
    padding: 0,
    margin: 0,
    width: "100%",
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
    color: "var(--mixa-accent-green)",
    flexShrink: 0,
  } as React.CSSProperties,

  loadingBar: {
    position: "absolute",
    bottom: 0,
    left: "6px",
    right: "6px",
    height: "2px",
    borderRadius: "1px",
    overflow: "hidden",
    backgroundColor: "var(--mixa-border-strong)",
  } as React.CSSProperties,

  loadingFill: {
    height: "100%",
    width: "30%",
    backgroundColor: "var(--mixa-accent-blue)",
    borderRadius: "1px",
    animation: "omnibar-loading 1.5s ease-in-out infinite",
  } as React.CSSProperties,

  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: "var(--mixa-bg-elevated)",
    border: "1px solid var(--mixa-border-strong)",
    borderRadius: "8px",
    boxShadow: "var(--mixa-shadow-dropdown)",
    maxHeight: "320px",
    overflowY: "auto",
    zIndex: 1000,
    padding: "4px 0",
  } as React.CSSProperties,

  suggestionItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "12px",
    color: "var(--mixa-text-secondary)",
  } as React.CSSProperties,

  suggestionItemActive: {
    backgroundColor: "var(--mixa-bg-active)",
    color: "var(--mixa-text-primary)",
  } as React.CSSProperties,

  suggestionIcon: {
    fontSize: "13px",
    width: "18px",
    textAlign: "center",
    flexShrink: 0,
  } as React.CSSProperties,

  suggestionLabel: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  suggestionDescription: {
    color: "var(--mixa-text-disabled)",
    fontSize: "11px",
    flexShrink: 0,
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  suggestionKindBadge: {
    fontSize: "10px",
    color: "var(--mixa-text-subtle)",
    border: "1px solid var(--mixa-border-strong)",
    borderRadius: "3px",
    padding: "1px 4px",
    flexShrink: 0,
  } as React.CSSProperties,
} as const;

// Keyframe animations are defined in globals.css

// --- Tab type icons ---

const TAB_TYPE_ICONS: Record<TabType, string> = {
  web: "\u{1F310}",
  terminal: "\u25B6\uFE0F",
  knowledge: "\u{1F4DA}",
  chat: "\u{1F4AC}",
  dashboard: "\u{1F4CA}",
  settings: "\u2699\uFE0F",
};

// --- Command definitions ---

interface CommandDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: (addTab: (type: TabType, url?: string) => string) => void;
}

const COMMANDS: CommandDef[] = [
  {
    id: "cmd-new-tab",
    label: "New Tab",
    description: "Open a new web tab",
    icon: "+",
    action: (addTab) => addTab("web"),
  },
  {
    id: "cmd-new-terminal",
    label: "New Terminal",
    description: "Open a terminal tab",
    icon: "\u25B6\uFE0F",
    action: (addTab) => addTab("terminal"),
  },
  {
    id: "cmd-open-shell",
    label: "Open Shell",
    description: "Open a raw shell tab",
    icon: ">_",
    action: (addTab) => addTab("terminal", "shell"),
  },
  {
    id: "cmd-knowledge",
    label: "Knowledge Base",
    description: "Open the knowledge base",
    icon: "\u{1F4DA}",
    action: (addTab) => addTab("knowledge"),
  },
  {
    id: "cmd-chat",
    label: "Chat",
    description: "Open AI chat",
    icon: "\u{1F4AC}",
    action: (addTab) => addTab("chat"),
  },
  {
    id: "cmd-dashboard-cost",
    label: "Cost Dashboard",
    description: "Open cost tracking dashboard",
    icon: "\u{1F4CA}",
    action: (addTab) => addTab("dashboard", "cost"),
  },
  {
    id: "cmd-dashboard-health",
    label: "Health Dashboard",
    description: "Open uptime & health monitoring dashboard",
    icon: "\u{1F3E5}",
    action: (addTab) => addTab("dashboard", "health"),
  },
  {
    id: "cmd-settings",
    label: "Settings",
    description: "Open settings",
    icon: "\u2699\uFE0F",
    action: (addTab) => addTab("settings"),
  },
];

// --- Component ---

export function Omnibar(): React.ReactElement {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTab = useTabStore((s) => {
    const id = s.activeTabId;
    return s.tabs.find((t) => t.id === id);
  });
  const tabs = useTabStore((s) => s.tabs);
  const addTab = useTabStore((s) => s.addTab);
  const activateTab = useTabStore((s) => s.activateTab);
  const searchHistory = useHistoryStore((s) => s.search);

  // Derived state
  const isWebTab = activeTab?.type === "web";
  const url = activeTab?.url ?? "";
  const isHttps = url.startsWith("https://");
  const isLoading = activeTab?.state === "loading";
  const displayUrl = url.replace(/^https?:\/\//, "");
  const isCommandMode = inputValue.startsWith(">");

  // Build suggestions based on input
  const suggestions = useMemo((): Suggestion[] => {
    const results: Suggestion[] = [];
    const query = inputValue.trim();

    if (!query) return results;

    if (isCommandMode) {
      // Command mode: filter commands by query after ">"
      const cmdQuery = query.slice(1).trim().toLowerCase();
      for (const cmd of COMMANDS) {
        if (!cmdQuery || cmd.label.toLowerCase().includes(cmdQuery)) {
          results.push({
            id: cmd.id,
            kind: "command",
            label: cmd.label,
            description: cmd.description,
            icon: cmd.icon,
            action: () => cmd.action(addTab),
          });
        }
      }
      return results;
    }

    const lowerQuery = query.toLowerCase();

    // Open tabs matching the query
    for (const tab of tabs) {
      const titleMatch = tab.title.toLowerCase().includes(lowerQuery);
      const urlMatch = tab.url?.toLowerCase().includes(lowerQuery) ?? false;
      if (titleMatch || urlMatch) {
        results.push({
          id: `tab-${tab.id}`,
          kind: "tab",
          label: tab.title,
          description: tab.url ?? `mixa://${tab.type}`,
          icon: TAB_TYPE_ICONS[tab.type],
          tabId: tab.id,
        });
      }
    }

    // History entries matching the query
    const openTabUrls = new Set(tabs.map((t) => t.url).filter(Boolean));
    const historyResults = searchHistory(query, 5);
    for (const entry of historyResults) {
      // Skip entries that are already shown as open tabs
      if (openTabUrls.has(entry.url)) continue;
      results.push({
        id: `history-${entry.url}-${entry.visitedAt}`,
        kind: "history",
        label: entry.title,
        description: entry.url.replace(/^https?:\/\//, ""),
        icon: "\u{1F553}",
        url: entry.url,
      });
    }

    // If it looks like a URL, offer to navigate
    if (isLikelyUrl(query)) {
      results.push({
        id: "navigate-url",
        kind: "url",
        label: query,
        description: "Go to URL",
        icon: "\u2192",
      });
    }

    // Always offer search as fallback
    results.push({
      id: "search",
      kind: "search",
      label: query,
      description: "Search Google",
      icon: "\u{1F50D}",
    });

    return results;
  }, [inputValue, tabs, addTab, isCommandMode, searchHistory]);

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions.length]);

  // Execute a suggestion
  const executeSuggestion = useCallback(
    (suggestion: Suggestion) => {
      switch (suggestion.kind) {
        case "tab":
          if (suggestion.tabId) {
            activateTab(suggestion.tabId);
          }
          break;
        case "command":
          suggestion.action?.();
          break;
        case "history":
        case "url": {
          const targetUrl = suggestion.kind === "history" && suggestion.url
            ? suggestion.url
            : ensureUrl(suggestion.label);
          if (activeTab?.type === "web") {
            void window.electronAPI.tabs.navigate(activeTab.id, targetUrl);
          } else {
            addTab("web", targetUrl);
          }
          break;
        }
        case "search": {
          const searchTarget = searchUrl(suggestion.label);
          if (activeTab?.type === "web") {
            void window.electronAPI.tabs.navigate(activeTab.id, searchTarget);
          } else {
            addTab("web", searchTarget);
          }
          break;
        }
      }
      blur();
    },
    [activeTab, activateTab, addTab],
  );

  // Focus/blur handlers
  const focus = useCallback(
    (commandMode?: boolean) => {
      setIsFocused(true);
      if (commandMode) {
        setInputValue(">");
      } else {
        // Pre-fill with current URL for editing
        setInputValue(url);
      }
      setActiveIndex(0);
      // Need to wait for the input to render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    },
    [url],
  );

  const blur = useCallback(() => {
    setIsFocused(false);
    setInputValue("");
    setActiveIndex(0);
    inputRef.current?.blur();
  }, []);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1,
          );
          break;
        case "Enter": {
          e.preventDefault();
          const selected = suggestions[activeIndex];
          if (selected) {
            executeSuggestion(selected);
          } else {
            // No suggestions but user pressed enter — navigate or search
            const query = inputValue.trim();
            if (query) {
              if (isLikelyUrl(query)) {
                const targetUrl = ensureUrl(query);
                if (activeTab?.type === "web") {
                  void window.electronAPI.tabs.navigate(
                    activeTab.id,
                    targetUrl,
                  );
                } else {
                  addTab("web", targetUrl);
                }
              } else {
                const searchTarget = searchUrl(query);
                if (activeTab?.type === "web") {
                  void window.electronAPI.tabs.navigate(
                    activeTab.id,
                    searchTarget,
                  );
                } else {
                  addTab("web", searchTarget);
                }
              }
              blur();
            }
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          blur();
          break;
        case "Tab":
          // Prevent tab switching; just close omnibar
          e.preventDefault();
          blur();
          break;
      }
    },
    [suggestions, activeIndex, executeSuggestion, inputValue, activeTab, addTab, blur],
  );

  // Scroll active suggestion into view
  useEffect(() => {
    if (!dropdownRef.current) return;
    const activeEl = dropdownRef.current.children[activeIndex] as
      | HTMLElement
      | undefined;
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Expose focus method for keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent): void => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      // Cmd+L: Focus omnibar (URL mode)
      if (e.key === "l" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        focus(false);
        return;
      }

      // Cmd+K: Focus omnibar (command mode)
      if (e.key === "k" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        focus(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [focus]);

  // Click outside to close
  useEffect(() => {
    if (!isFocused) return;

    const handleClickOutside = (e: MouseEvent): void => {
      const target = e.target as Node;
      const wrapper = inputRef.current?.parentElement?.parentElement;
      if (wrapper && !wrapper.contains(target)) {
        blur();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFocused, blur]);

  const showDropdown = isFocused && suggestions.length > 0;

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.display,
          ...(isFocused ? styles.displayFocused : {}),
          position: "relative",
        }}
        onClick={() => {
          if (!isFocused) focus(false);
        }}
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        aria-label="Address bar and command palette"
      >
        {isFocused ? (
          <input
            ref={inputRef}
            type="text"
            style={styles.input}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={(e) => {
              // Don't blur if clicking a dropdown item
              const related = e.relatedTarget as HTMLElement | null;
              if (related?.closest("[data-omnibar-dropdown]")) return;
            }}
            placeholder={isCommandMode ? "Type a command..." : "Search or enter URL"}
            spellCheck={false}
            autoComplete="off"
            aria-label="Search or enter URL"
          />
        ) : (
          <>
            {isWebTab && url ? (
              <>
                {isHttps && <span style={styles.lockIcon}>{"\u{1F512}"}</span>}
                <span style={styles.urlText}>{displayUrl}</span>
              </>
            ) : isWebTab ? (
              <span style={{ ...styles.urlText, color: "var(--mixa-text-disabled)" }}>
                Search or enter URL
              </span>
            ) : (
              <span style={{ ...styles.urlText, color: "var(--mixa-text-disabled)" }}>
                mixa://{activeTab?.type ?? "home"}
              </span>
            )}
          </>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div style={styles.loadingBar}>
            <div style={styles.loadingFill} />
          </div>
        )}
      </div>

      {/* Suggestion dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          style={styles.dropdown}
          data-omnibar-dropdown
          role="listbox"
          aria-label="Suggestions"
        >
          {suggestions.map((s, i) => (
            <div
              key={s.id}
              style={{
                ...styles.suggestionItem,
                ...(i === activeIndex ? styles.suggestionItemActive : {}),
              }}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                executeSuggestion(s);
              }}
            >
              <span style={styles.suggestionIcon}>{s.icon}</span>
              <span style={styles.suggestionLabel}>{s.label}</span>
              <span style={styles.suggestionDescription}>{s.description}</span>
              <span style={styles.suggestionKindBadge}>
                {s.kind === "tab"
                  ? "Tab"
                  : s.kind === "command"
                    ? "Cmd"
                    : s.kind === "url"
                      ? "URL"
                      : "Search"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
