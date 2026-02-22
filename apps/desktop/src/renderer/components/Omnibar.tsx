import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Icon } from "@mixa-ai/ui";
import type { IconName } from "@mixa-ai/ui";
import { useTabStore } from "../stores/tabs";
import { useHistoryStore } from "../stores/history";
import { APP_TEMPLATES, generatePartitionId } from "../stores/appTemplates";
import type { TabType } from "@mixa-ai/types";

type SuggestionKind = "tab" | "command" | "url" | "search" | "history";

interface Suggestion {
  id: string;
  kind: SuggestionKind;
  label: string;
  description: string;
  iconName?: IconName;
  iconEmoji?: string;
  tabId?: string;
  url?: string;
  action?: () => void;
}

function isLikelyUrl(input: string): boolean {
  if (/^https?:\/\//i.test(input)) return true;
  if (/^[^\s]+\.[^\s]+$/.test(input)) return true;
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

const TAB_TYPE_ICONS: Record<TabType, IconName> = {
  web: "web",
  app: "app",
  terminal: "terminal",
  knowledge: "knowledge",
  chat: "chat",
  canvas: "canvas",
  dashboard: "dashboard",
  settings: "settings",
};

interface CommandDef {
  id: string;
  label: string;
  description: string;
  iconName: IconName;
  action: (addTab: (type: TabType, url?: string) => string) => void;
}

const COMMANDS: CommandDef[] = [
  {
    id: "cmd-new-tab",
    label: "New Tab",
    description: "Open a new web tab",
    iconName: "add",
    action: (addTab) => addTab("web"),
  },
  {
    id: "cmd-new-terminal",
    label: "New Terminal",
    description: "Open a terminal tab",
    iconName: "terminal",
    action: (addTab) => addTab("terminal"),
  },
  {
    id: "cmd-open-shell",
    label: "Open Shell",
    description: "Open a raw shell tab",
    iconName: "terminal",
    action: (addTab) => addTab("terminal", "shell"),
  },
  {
    id: "cmd-knowledge",
    label: "Knowledge Base",
    description: "Open the knowledge base",
    iconName: "knowledge",
    action: (addTab) => addTab("knowledge"),
  },
  {
    id: "cmd-chat",
    label: "Chat",
    description: "Open AI chat",
    iconName: "chat",
    action: (addTab) => addTab("chat"),
  },
  {
    id: "cmd-dashboard-cost",
    label: "Cost Dashboard",
    description: "Open cost tracking dashboard",
    iconName: "cost",
    action: (addTab) => addTab("dashboard", "cost"),
  },
  {
    id: "cmd-dashboard-health",
    label: "Health Dashboard",
    description: "Open uptime & health monitoring dashboard",
    iconName: "pulse",
    action: (addTab) => addTab("dashboard", "health"),
  },
  {
    id: "cmd-dashboard-knowledge",
    label: "Knowledge Stats",
    description: "View knowledge base statistics & insights",
    iconName: "knowledge",
    action: (addTab) => addTab("dashboard", "knowledge"),
  },
  {
    id: "cmd-canvas",
    label: "New Canvas",
    description: "Open a new canvas for drawing and diagramming",
    iconName: "canvas",
    action: (addTab) => addTab("canvas"),
  },
  {
    id: "cmd-drawing",
    label: "New Drawing",
    description: "Open a new visual drawing workspace",
    iconName: "canvas",
    action: (addTab) => addTab("canvas"),
  },
  {
    id: "cmd-settings",
    label: "Settings",
    description: "Open settings",
    iconName: "settings",
    action: (addTab) => addTab("settings"),
  },
  ...APP_TEMPLATES.map((template) => ({
    id: `cmd-app-${template.id}`,
    label: `New App ${template.name}`,
    description: `Open ${template.name} in an isolated app tab`,
    iconName: "app" as IconName,
    action: () => {
      const partitionId = generatePartitionId(template.id);
      useTabStore.getState().addAppTab({
        templateId: template.id,
        title: template.name,
        url: template.url,
        icon: template.icon,
        partitionId,
      });
    },
  })),
];

const styles = {
  wrapper: {
    position: "relative",
    flex: 1,
    marginLeft: "4px",
    marginRight: "4px",
  } as React.CSSProperties,

  display: {
    height: "28px",
    backgroundColor: "var(--mixa-bg-elevated)",
    borderRadius: "6px",
    border: "1px solid var(--mixa-border-subtle)",
    color: "var(--mixa-text-secondary)",
    fontSize: "13px",
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
    fontSize: "13px",
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
    flexShrink: 0,
    display: "flex",
    color: "var(--mixa-accent-green)",
  } as React.CSSProperties,

  loadingBar: {
    position: "absolute",
    bottom: 0,
    left: "6px",
    right: "6px",
    height: "2px",
    borderRadius: "1px",
    overflow: "hidden",
    backgroundColor: "var(--mixa-border-default)",
  } as React.CSSProperties,

  loadingFill: {
    height: "100%",
    width: "30%",
    backgroundColor: "var(--mixa-accent-primary)",
    borderRadius: "1px",
    animation: "omnibar-loading 1.5s ease-in-out infinite",
  } as React.CSSProperties,

  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: "var(--mixa-bg-elevated)",
    border: "1px solid var(--mixa-border-subtle)",
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
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "13px",
    color: "var(--mixa-text-secondary)",
  } as React.CSSProperties,

  suggestionItemActive: {
    backgroundColor: "var(--mixa-bg-active)",
    color: "var(--mixa-text-primary)",
  } as React.CSSProperties,

  suggestionIcon: {
    width: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as React.CSSProperties,

  suggestionLabel: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  suggestionDescription: {
    color: "var(--mixa-text-muted)",
    fontSize: "11px",
    flexShrink: 0,
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  suggestionKindBadge: {
    fontSize: "10px",
    color: "var(--mixa-text-muted)",
    border: "1px solid var(--mixa-border-default)",
    borderRadius: "4px",
    padding: "1px 5px",
    flexShrink: 0,
  } as React.CSSProperties,
} as const;

function SuggestionIconDisplay({ suggestion }: { suggestion: Suggestion }): React.ReactElement {
  if (suggestion.iconName) {
    return <Icon name={suggestion.iconName} size={14} />;
  }
  return <span style={{ fontSize: "13px" }}>{suggestion.iconEmoji ?? ""}</span>;
}

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

  const isWebTab = activeTab?.type === "web" || activeTab?.type === "app";
  const url = activeTab?.url ?? "";
  const isHttps = url.startsWith("https://");
  const isLoading = activeTab?.state === "loading";
  const displayUrl = url.replace(/^https?:\/\//, "");
  const isCommandMode = inputValue.startsWith(">");

  const suggestions = useMemo((): Suggestion[] => {
    const results: Suggestion[] = [];
    const query = inputValue.trim();

    if (!query) return results;

    if (isCommandMode) {
      const cmdQuery = query.slice(1).trim().toLowerCase();
      for (const cmd of COMMANDS) {
        if (!cmdQuery || cmd.label.toLowerCase().includes(cmdQuery)) {
          results.push({
            id: cmd.id,
            kind: "command",
            label: cmd.label,
            description: cmd.description,
            iconName: cmd.iconName,
            action: () => cmd.action(addTab),
          });
        }
      }
      return results;
    }

    const lowerQuery = query.toLowerCase();

    for (const tab of tabs) {
      const titleMatch = tab.title.toLowerCase().includes(lowerQuery);
      const urlMatch = tab.url?.toLowerCase().includes(lowerQuery) ?? false;
      if (titleMatch || urlMatch) {
        results.push({
          id: `tab-${tab.id}`,
          kind: "tab",
          label: tab.title,
          description: tab.url ?? `mixa://${tab.type}`,
          iconName: TAB_TYPE_ICONS[tab.type],
          tabId: tab.id,
        });
      }
    }

    const openTabUrls = new Set(tabs.map((t) => t.url).filter(Boolean));
    const historyResults = searchHistory(query, 5);
    for (const entry of historyResults) {
      if (openTabUrls.has(entry.url)) continue;
      results.push({
        id: `history-${entry.url}-${entry.visitedAt}`,
        kind: "history",
        label: entry.title,
        description: entry.url.replace(/^https?:\/\//, ""),
        iconName: "clock",
        url: entry.url,
      });
    }

    if (isLikelyUrl(query)) {
      results.push({
        id: "navigate-url",
        kind: "url",
        label: query,
        description: "Go to URL",
        iconName: "externalLink",
      });
    }

    results.push({
      id: "search",
      kind: "search",
      label: query,
      description: "Search Google",
      iconName: "search",
    });

    return results;
  }, [inputValue, tabs, addTab, isCommandMode, searchHistory]);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions.length]);

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

  const focus = useCallback(
    (commandMode?: boolean) => {
      setIsFocused(true);
      if (commandMode) {
        setInputValue(">");
      } else {
        setInputValue(url);
      }
      setActiveIndex(0);
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
            const query = inputValue.trim();
            if (query) {
              if (isLikelyUrl(query)) {
                const targetUrl = ensureUrl(query);
                if (activeTab?.type === "web") {
                  void window.electronAPI.tabs.navigate(activeTab.id, targetUrl);
                } else {
                  addTab("web", targetUrl);
                }
              } else {
                const searchTarget = searchUrl(query);
                if (activeTab?.type === "web") {
                  void window.electronAPI.tabs.navigate(activeTab.id, searchTarget);
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
          e.preventDefault();
          blur();
          break;
      }
    },
    [suggestions, activeIndex, executeSuggestion, inputValue, activeTab, addTab, blur],
  );

  useEffect(() => {
    if (!dropdownRef.current) return;
    const activeEl = dropdownRef.current.children[activeIndex] as HTMLElement | undefined;
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent): void => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === "l" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        focus(false);
        return;
      }

      if (e.key === "k" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        focus(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [focus]);

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
                {isHttps && (
                  <span style={styles.lockIcon}>
                    <Icon name="lock" size={12} />
                  </span>
                )}
                <span style={styles.urlText}>{displayUrl}</span>
              </>
            ) : isWebTab ? (
              <span style={{ ...styles.urlText, color: "var(--mixa-text-muted)" }}>
                Search or enter URL
              </span>
            ) : (
              <span style={{ ...styles.urlText, color: "var(--mixa-text-muted)" }}>
                mixa://{activeTab?.type ?? "home"}
              </span>
            )}
          </>
        )}

        {isLoading && (
          <div style={styles.loadingBar}>
            <div style={styles.loadingFill} />
          </div>
        )}
      </div>

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
              <span style={styles.suggestionIcon}>
                <SuggestionIconDisplay suggestion={s} />
              </span>
              <span style={styles.suggestionLabel}>{s.label}</span>
              <span style={styles.suggestionDescription}>{s.description}</span>
              <span style={styles.suggestionKindBadge}>
                {s.kind === "tab"
                  ? "Tab"
                  : s.kind === "command"
                    ? "Cmd"
                    : s.kind === "history"
                      ? "History"
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
