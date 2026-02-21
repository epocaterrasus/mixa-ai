import { useCallback, useEffect, useRef, useState } from "react";
import type { Tab, TabType } from "@mixa-ai/types";
import { useTabStore } from "../stores/tabs";
import {
  useSidebarStore,
  COLLAPSED_WIDTH,
  MIN_WIDTH,
  MAX_WIDTH,
} from "../stores/sidebar";

// ─── Tab type metadata ───────────────────────────────────────────

interface TabTypeInfo {
  icon: string;
  label: string;
}

const TAB_TYPE_INFO: Record<TabType, TabTypeInfo> = {
  web: { icon: "\u{1F310}", label: "Web" },
  terminal: { icon: "\u25B6", label: "Terminal" },
  knowledge: { icon: "\u{1F4DA}", label: "Knowledge" },
  chat: { icon: "\u{1F4AC}", label: "Chat" },
  dashboard: { icon: "\u{1F4CA}", label: "Dashboard" },
  settings: { icon: "\u2699", label: "Settings" },
};

const TAB_TYPE_ORDER: TabType[] = [
  "web",
  "terminal",
  "knowledge",
  "chat",
  "dashboard",
  "settings",
];

// ─── Quick-access buttons ────────────────────────────────────────

interface QuickAction {
  type: TabType;
  icon: string;
  label: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { type: "terminal", icon: "\u25B6", label: "Terminal" },
  { type: "knowledge", icon: "\u{1F4DA}", label: "Knowledge" },
  { type: "chat", icon: "\u{1F4AC}", label: "Chat" },
  { type: "settings", icon: "\u2699", label: "Settings" },
];

// ─── Styles ──────────────────────────────────────────────────────

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#111",
    borderRight: "1px solid #2a2a2a",
    overflow: "hidden",
    position: "relative",
    userSelect: "none",
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 10px",
    borderBottom: "1px solid #222",
    flexShrink: 0,
  } as React.CSSProperties,
  headerTitle: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  } as React.CSSProperties,
  collapseButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "22px",
    height: "22px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "transparent",
    color: "#666",
    cursor: "pointer",
    fontSize: "12px",
    padding: 0,
  } as React.CSSProperties,
  scrollArea: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
  } as React.CSSProperties,
  section: {
    padding: "6px 0",
  } as React.CSSProperties,
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    padding: "4px 10px",
    fontSize: "10px",
    fontWeight: 600,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  } as React.CSSProperties,
  tabItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "5px 10px",
    cursor: "pointer",
    fontSize: "12px",
    color: "#aaa",
    border: "none",
    backgroundColor: "transparent",
    width: "100%",
    textAlign: "left",
    borderRadius: 0,
    overflow: "hidden",
  } as React.CSSProperties,
  tabItemActive: {
    backgroundColor: "#1e1e2e",
    color: "#fafafa",
  } as React.CSSProperties,
  tabItemHover: {
    backgroundColor: "#1a1a1a",
  } as React.CSSProperties,
  tabFavicon: {
    width: "14px",
    height: "14px",
    flexShrink: 0,
    borderRadius: "2px",
    fontSize: "11px",
    textAlign: "center",
    lineHeight: "14px",
  } as React.CSSProperties,
  tabTitle: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  tabClose: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "16px",
    height: "16px",
    borderRadius: "3px",
    border: "none",
    backgroundColor: "transparent",
    color: "#555",
    cursor: "pointer",
    fontSize: "13px",
    padding: 0,
    flexShrink: 0,
    lineHeight: "1",
  } as React.CSSProperties,
  quickActions: {
    borderTop: "1px solid #222",
    padding: "6px 0",
    flexShrink: 0,
  } as React.CSSProperties,
  quickActionButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "6px 10px",
    border: "none",
    backgroundColor: "transparent",
    color: "#888",
    cursor: "pointer",
    fontSize: "12px",
    textAlign: "left",
  } as React.CSSProperties,
  quickActionIcon: {
    width: "14px",
    textAlign: "center",
    fontSize: "12px",
    flexShrink: 0,
  } as React.CSSProperties,
  resizeHandle: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "4px",
    height: "100%",
    cursor: "col-resize",
    zIndex: 10,
  } as React.CSSProperties,
  // Collapsed state
  collapsedContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    height: "100%",
    backgroundColor: "#111",
    borderRight: "1px solid #2a2a2a",
    overflow: "hidden",
    userSelect: "none",
    width: `${COLLAPSED_WIDTH}px`,
  } as React.CSSProperties,
  collapsedToggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    margin: "6px 0",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "#666",
    cursor: "pointer",
    fontSize: "14px",
    padding: 0,
  } as React.CSSProperties,
  collapsedDivider: {
    width: "24px",
    height: "1px",
    backgroundColor: "#222",
    margin: "2px 0",
  } as React.CSSProperties,
  collapsedTabIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "28px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "#888",
    cursor: "pointer",
    fontSize: "13px",
    padding: 0,
  } as React.CSSProperties,
  // Context menu
  contextMenu: {
    position: "fixed",
    backgroundColor: "#252525",
    border: "1px solid #3a3a3a",
    borderRadius: "6px",
    padding: "4px 0",
    zIndex: 9999,
    minWidth: "160px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  } as React.CSSProperties,
  contextMenuItem: {
    display: "block",
    width: "100%",
    padding: "6px 12px",
    border: "none",
    backgroundColor: "transparent",
    color: "#ccc",
    fontSize: "12px",
    textAlign: "left",
    cursor: "pointer",
  } as React.CSSProperties,
  contextMenuItemHover: {
    backgroundColor: "#333",
    color: "#fff",
  } as React.CSSProperties,
  contextMenuSeparator: {
    height: "1px",
    backgroundColor: "#3a3a3a",
    margin: "4px 0",
  } as React.CSSProperties,
} as const;

// ─── Context Menu ────────────────────────────────────────────────

interface ContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

function ContextMenu({
  state,
  onClose,
}: {
  state: ContextMenuState;
  onClose: () => void;
}): React.ReactElement {
  const closeTab = useTabStore((s) => s.closeTab);
  const closeOtherTabs = useTabStore((s) => s.closeOtherTabs);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const items = [
    {
      id: "close",
      label: "Close Tab",
      action: () => {
        closeTab(state.tabId);
        onClose();
      },
    },
    {
      id: "close-others",
      label: "Close Other Tabs",
      action: () => {
        closeOtherTabs(state.tabId);
        onClose();
      },
    },
  ];

  return (
    <div ref={menuRef} style={{ ...styles.contextMenu, left: state.x, top: state.y }}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          style={{
            ...styles.contextMenuItem,
            ...(hoveredItem === item.id ? styles.contextMenuItemHover : {}),
          }}
          onClick={item.action}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ─── Sidebar Tab Item ────────────────────────────────────────────

function SidebarTabItem({
  tab,
  onContextMenu,
}: {
  tab: Tab;
  onContextMenu: (tabId: string, x: number, y: number) => void;
}): React.ReactElement {
  const activateTab = useTabStore((s) => s.activateTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const [hovered, setHovered] = useState(false);
  const [closeHovered, setCloseHovered] = useState(false);

  const handleClick = useCallback(() => {
    activateTab(tab.id);
  }, [activateTab, tab.id]);

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      closeTab(tab.id);
    },
    [closeTab, tab.id],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu(tab.id, e.clientX, e.clientY);
    },
    [onContextMenu, tab.id],
  );

  const faviconContent = tab.faviconUrl ? (
    <img
      src={tab.faviconUrl}
      alt=""
      style={styles.tabFavicon}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  ) : (
    <span style={styles.tabFavicon}>
      {TAB_TYPE_INFO[tab.type].icon}
    </span>
  );

  return (
    <button
      type="button"
      style={{
        ...styles.tabItem,
        ...(tab.isActive ? styles.tabItemActive : {}),
        ...(hovered && !tab.isActive ? styles.tabItemHover : {}),
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={tab.title}
      title={tab.title}
    >
      {faviconContent}
      <span style={styles.tabTitle}>{tab.title}</span>
      <button
        type="button"
        aria-label={`Close ${tab.title}`}
        style={{
          ...styles.tabClose,
          ...(closeHovered ? { backgroundColor: "#444", color: "#fff" } : {}),
          opacity: hovered || tab.isActive ? 1 : 0,
        }}
        onClick={handleClose}
        onMouseEnter={() => setCloseHovered(true)}
        onMouseLeave={() => setCloseHovered(false)}
      >
        ×
      </button>
    </button>
  );
}

// ─── Collapsed Sidebar ──────────────────────────────────────────

function CollapsedSidebar(): React.ReactElement {
  const toggle = useSidebarStore((s) => s.toggle);
  const tabs = useTabStore((s) => s.tabs);
  const activateTab = useTabStore((s) => s.activateTab);
  const addTab = useTabStore((s) => s.addTab);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={styles.collapsedContainer}>
      <button
        type="button"
        style={{
          ...styles.collapsedToggle,
          ...(hoveredId === "expand" ? { backgroundColor: "#1a1a1a" } : {}),
        }}
        onClick={toggle}
        onMouseEnter={() => setHoveredId("expand")}
        onMouseLeave={() => setHoveredId(null)}
        aria-label="Expand sidebar"
        title="Expand sidebar (Cmd+B)"
      >
        &#x25B6;
      </button>
      <div style={styles.collapsedDivider} />

      {/* Show icons for open tabs */}
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          style={{
            ...styles.collapsedTabIcon,
            ...(tab.isActive ? { backgroundColor: "#1e1e2e", color: "#fafafa" } : {}),
            ...(hoveredId === tab.id && !tab.isActive ? { backgroundColor: "#1a1a1a" } : {}),
          }}
          onClick={() => activateTab(tab.id)}
          onMouseEnter={() => setHoveredId(tab.id)}
          onMouseLeave={() => setHoveredId(null)}
          aria-label={tab.title}
          title={tab.title}
        >
          {tab.faviconUrl ? (
            <img
              src={tab.faviconUrl}
              alt=""
              style={{ width: "14px", height: "14px", borderRadius: "2px" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            TAB_TYPE_INFO[tab.type].icon
          )}
        </button>
      ))}

      <div style={{ flex: 1 }} />
      <div style={styles.collapsedDivider} />

      {/* Quick action icons */}
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.type}
          type="button"
          style={{
            ...styles.collapsedTabIcon,
            ...(hoveredId === `qa-${action.type}` ? { backgroundColor: "#1a1a1a" } : {}),
          }}
          onClick={() => addTab(action.type)}
          onMouseEnter={() => setHoveredId(`qa-${action.type}`)}
          onMouseLeave={() => setHoveredId(null)}
          aria-label={`New ${action.label}`}
          title={`New ${action.label}`}
        >
          {action.icon}
        </button>
      ))}
      <div style={{ height: "6px" }} />
    </div>
  );
}

// ─── Main Sidebar Component ─────────────────────────────────────

export function Sidebar(): React.ReactElement {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const width = useSidebarStore((s) => s.width);
  const toggle = useSidebarStore((s) => s.toggle);
  const setWidth = useSidebarStore((s) => s.setWidth);
  const tabs = useTabStore((s) => s.tabs);
  const addTab = useTabStore((s) => s.addTab);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [resizing, setResizing] = useState(false);
  const [collapseHovered, setCollapseHovered] = useState(false);
  const [qaHovered, setQaHovered] = useState<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Notify main process of sidebar width changes
  const effectiveWidth = isCollapsed ? COLLAPSED_WIDTH : width;
  useEffect(() => {
    window.electronAPI.sidebar.setWidth(effectiveWidth);
  }, [effectiveWidth]);

  // Cmd+B toggle shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === "b" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  // Resize drag handling
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = width;
    },
    [width],
  );

  useEffect(() => {
    if (!resizing) return;

    function handleMouseMove(e: MouseEvent): void {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = resizeStartWidth.current + delta;
      setWidth(newWidth);
    }

    function handleMouseUp(): void {
      setResizing(false);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, setWidth]);

  // Context menu handler
  const handleContextMenu = useCallback((tabId: string, x: number, y: number) => {
    setContextMenu({ tabId, x, y });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Collapsed view
  if (isCollapsed) {
    return (
      <>
        <CollapsedSidebar />
        {contextMenu && (
          <ContextMenu state={contextMenu} onClose={closeContextMenu} />
        )}
      </>
    );
  }

  // Group tabs by type
  const tabsByType = new Map<TabType, Tab[]>();
  for (const tab of tabs) {
    const existing = tabsByType.get(tab.type);
    if (existing) {
      existing.push(tab);
    } else {
      tabsByType.set(tab.type, [tab]);
    }
  }

  return (
    <div
      style={{
        ...styles.container,
        width: `${width}px`,
        minWidth: `${MIN_WIDTH}px`,
        maxWidth: `${MAX_WIDTH}px`,
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Tabs</span>
        <button
          type="button"
          style={{
            ...styles.collapseButton,
            ...(collapseHovered ? { backgroundColor: "#1a1a1a" } : {}),
          }}
          onClick={toggle}
          onMouseEnter={() => setCollapseHovered(true)}
          onMouseLeave={() => setCollapseHovered(false)}
          aria-label="Collapse sidebar"
          title="Collapse sidebar (Cmd+B)"
        >
          &#x25C0;
        </button>
      </div>

      {/* Tab tree */}
      <div style={styles.scrollArea}>
        {TAB_TYPE_ORDER.map((type) => {
          const typeTabs = tabsByType.get(type);
          if (!typeTabs || typeTabs.length === 0) return null;

          return (
            <div key={type} style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ marginRight: "4px" }}>{TAB_TYPE_INFO[type].icon}</span>
                {TAB_TYPE_INFO[type].label} ({typeTabs.length})
              </div>
              {typeTabs.map((tab) => (
                <SidebarTabItem
                  key={tab.id}
                  tab={tab}
                  onContextMenu={handleContextMenu}
                />
              ))}
            </div>
          );
        })}

        {tabs.length === 0 && (
          <div
            style={{
              padding: "20px 10px",
              color: "#555",
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            No open tabs
          </div>
        )}
      </div>

      {/* Quick-access actions */}
      <div style={styles.quickActions}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.type}
            type="button"
            style={{
              ...styles.quickActionButton,
              ...(qaHovered === action.type ? { backgroundColor: "#1a1a1a", color: "#ccc" } : {}),
            }}
            onClick={() => addTab(action.type)}
            onMouseEnter={() => setQaHovered(action.type)}
            onMouseLeave={() => setQaHovered(null)}
            aria-label={`New ${action.label}`}
            title={`New ${action.label}`}
          >
            <span style={styles.quickActionIcon}>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Resize handle */}
      <div
        style={{
          ...styles.resizeHandle,
          ...(resizing ? { backgroundColor: "#6366f1" } : {}),
        }}
        onMouseDown={handleResizeStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setWidth(width - 10);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setWidth(width + 10);
          }
        }}
      />

      {/* Context menu overlay */}
      {contextMenu && (
        <ContextMenu state={contextMenu} onClose={closeContextMenu} />
      )}
    </div>
  );
}
