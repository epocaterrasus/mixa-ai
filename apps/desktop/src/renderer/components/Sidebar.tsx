import { useCallback, useEffect, useRef, useState } from "react";
import type { Tab, TabType } from "@mixa-ai/types";
import { Icon } from "@mixa-ai/ui";
import type { IconName } from "@mixa-ai/ui";
import { useTabStore } from "../stores/tabs";
import {
  useSidebarStore,
  COLLAPSED_WIDTH,
  MIN_WIDTH,
  MAX_WIDTH,
} from "../stores/sidebar";
import { useCanvasStore } from "../stores/canvas";
import { APP_TEMPLATES, getAppTemplate, generatePartitionId } from "../stores/appTemplates";

// ─── Tab type metadata ───────────────────────────────────────────

interface TabTypeInfo {
  icon: IconName;
  label: string;
}

const TAB_TYPE_INFO: Record<TabType, TabTypeInfo> = {
  web: { icon: "web", label: "Web" },
  app: { icon: "app", label: "Apps" },
  terminal: { icon: "terminal", label: "Terminal" },
  knowledge: { icon: "knowledge", label: "Knowledge" },
  chat: { icon: "chat", label: "Chat" },
  canvas: { icon: "canvas", label: "Canvas" },
  dashboard: { icon: "dashboard", label: "Dashboard" },
  settings: { icon: "settings", label: "Settings" },
};

const TAB_TYPE_ORDER: TabType[] = [
  "web",
  "app",
  "terminal",
  "knowledge",
  "chat",
  "canvas",
  "dashboard",
  "settings",
];

// ─── Quick-access buttons ────────────────────────────────────────

interface QuickAction {
  type: TabType;
  iconName: IconName;
  label: string;
  url?: string;
  appTemplateId?: string;
  appIcon?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { type: "terminal", iconName: "terminal", label: "Terminal" },
  { type: "knowledge", iconName: "knowledge", label: "Knowledge" },
  { type: "chat", iconName: "chat", label: "Chat" },
  { type: "dashboard", iconName: "cost", label: "Cost Dashboard" },
  { type: "dashboard", iconName: "pulse", label: "Health Dashboard", url: "health" },
  { type: "dashboard", iconName: "knowledge", label: "Knowledge Stats", url: "knowledge" },
  { type: "canvas", iconName: "canvas", label: "Canvas" },
  { type: "settings", iconName: "settings", label: "Settings" },
  ...APP_TEMPLATES.map((t) => ({
    type: "app" as TabType,
    iconName: t.iconName as IconName,
    label: t.name,
    appTemplateId: t.id,
    appIcon: t.icon,
  })),
];

function handleQuickAction(
  action: QuickAction,
  switchOrCreateTab: (type: TabType, url?: string) => string,
  addAppTab: (options: {
    templateId: string;
    title: string;
    url: string;
    icon: string;
    partitionId: string;
  }) => string,
): void {
  if (action.type === "app" && action.appTemplateId) {
    const template = getAppTemplate(action.appTemplateId);
    if (template) {
      addAppTab({
        templateId: template.id,
        title: template.name,
        url: template.url,
        icon: template.icon,
        partitionId: generatePartitionId(template.id),
      });
    }
  } else {
    switchOrCreateTab(action.type, action.url);
  }
}

// ─── Styles (Ma spacing, whisper-thin borders) ──────────────────

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "var(--mixa-bg-surface)",
    borderRight: "1px solid var(--mixa-border-subtle)",
    overflow: "hidden",
    position: "relative",
    userSelect: "none",
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px 8px",
    paddingTop: "38px",
    flexShrink: 0,
  } as React.CSSProperties,
  headerTitle: {
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--mixa-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  } as React.CSSProperties,
  collapseButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-muted)",
    cursor: "pointer",
    padding: 0,
  } as React.CSSProperties,
  scrollArea: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
  } as React.CSSProperties,
  section: {
    padding: "8px 0",
  } as React.CSSProperties,
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 12px",
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--mixa-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  } as React.CSSProperties,
  tabItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "13px",
    color: "var(--mixa-text-secondary)",
    border: "none",
    backgroundColor: "transparent",
    width: "100%",
    textAlign: "left",
    borderRadius: 0,
    overflow: "hidden",
    lineHeight: "1.3",
  } as React.CSSProperties,
  tabItemActive: {
    backgroundColor: "var(--mixa-bg-active-accent)",
    color: "var(--mixa-text-primary)",
  } as React.CSSProperties,
  tabItemHover: {
    backgroundColor: "var(--mixa-bg-hover)",
  } as React.CSSProperties,
  tabFavicon: {
    width: "16px",
    height: "16px",
    flexShrink: 0,
    borderRadius: "2px",
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
    width: "18px",
    height: "18px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-muted)",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  } as React.CSSProperties,
  quickActions: {
    padding: "8px 0",
    flexShrink: 0,
  } as React.CSSProperties,
  quickActionButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "6px 12px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-muted)",
    cursor: "pointer",
    fontSize: "13px",
    textAlign: "left",
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
  collapsedContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    height: "100%",
    backgroundColor: "var(--mixa-bg-surface)",
    borderRight: "1px solid var(--mixa-border-subtle)",
    overflow: "hidden",
    userSelect: "none",
    width: `${COLLAPSED_WIDTH}px`,
    paddingTop: "32px",
  } as React.CSSProperties,
  collapsedToggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    margin: "8px 0",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-muted)",
    cursor: "pointer",
    padding: 0,
  } as React.CSSProperties,
  collapsedDivider: {
    width: "24px",
    height: "1px",
    backgroundColor: "var(--mixa-border-subtle)",
    margin: "4px 0",
  } as React.CSSProperties,
  collapsedTabIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-muted)",
    cursor: "pointer",
    padding: 0,
  } as React.CSSProperties,
  contextMenu: {
    position: "fixed",
    backgroundColor: "var(--mixa-bg-elevated)",
    border: "1px solid var(--mixa-border-subtle)",
    borderRadius: "8px",
    padding: "4px 0",
    zIndex: 9999,
    minWidth: "160px",
    boxShadow: "var(--mixa-shadow-overlay)",
  } as React.CSSProperties,
  contextMenuItem: {
    display: "block",
    width: "100%",
    padding: "8px 12px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-secondary)",
    fontSize: "13px",
    textAlign: "left",
    cursor: "pointer",
  } as React.CSSProperties,
  contextMenuItemHover: {
    backgroundColor: "var(--mixa-bg-hover)",
    color: "var(--mixa-text-primary)",
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

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData(
        "text/x-mixa-tab",
        JSON.stringify({ id: tab.id, title: tab.title, type: tab.type, url: tab.url }),
      );
      e.dataTransfer.effectAllowed = "copy";
    },
    [tab.id, tab.title, tab.type, tab.url],
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
    <Icon name={TAB_TYPE_INFO[tab.type].icon} size={14} />
  );

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      style={{
        ...styles.tabItem,
        ...(tab.isActive ? styles.tabItemActive : {}),
        ...(hovered && !tab.isActive ? styles.tabItemHover : {}),
      }}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(); }}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
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
          ...(closeHovered ? { backgroundColor: "var(--mixa-bg-active)", color: "var(--mixa-text-primary)" } : {}),
          opacity: hovered || tab.isActive ? 1 : 0,
        }}
        onClick={handleClose}
        onMouseEnter={() => setCloseHovered(true)}
        onMouseLeave={() => setCloseHovered(false)}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  );
}

// ─── Collapsed Sidebar ──────────────────────────────────────────

function CollapsedSidebar(): React.ReactElement {
  const toggle = useSidebarStore((s) => s.toggle);
  const tabs = useTabStore((s) => s.tabs);
  const activateTab = useTabStore((s) => s.activateTab);
  const switchOrCreateTab = useTabStore((s) => s.switchOrCreateTab);
  const addAppTab = useTabStore((s) => s.addAppTab);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={styles.collapsedContainer}>
      <button
        type="button"
        style={{
          ...styles.collapsedToggle,
          ...(hoveredId === "expand" ? { backgroundColor: "var(--mixa-bg-hover)" } : {}),
        }}
        onClick={toggle}
        onMouseEnter={() => setHoveredId("expand")}
        onMouseLeave={() => setHoveredId(null)}
        aria-label="Expand sidebar"
        title="Expand sidebar (Cmd+B)"
      >
        <Icon name="expand" size={16} />
      </button>
      <div style={styles.collapsedDivider} />

      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          style={{
            ...styles.collapsedTabIcon,
            ...(tab.isActive ? { backgroundColor: "var(--mixa-bg-active-accent)", color: "var(--mixa-text-primary)" } : {}),
            ...(hoveredId === tab.id && !tab.isActive ? { backgroundColor: "var(--mixa-bg-hover)" } : {}),
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
              style={{ width: "16px", height: "16px", borderRadius: "2px" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Icon name={TAB_TYPE_INFO[tab.type].icon} size={16} />
          )}
        </button>
      ))}

      <div style={{ flex: 1 }} />
      <div style={styles.collapsedDivider} />

      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          type="button"
          style={{
            ...styles.collapsedTabIcon,
            ...(hoveredId === `qa-${action.label}` ? { backgroundColor: "var(--mixa-bg-hover)" } : {}),
          }}
          onClick={() => handleQuickAction(action, switchOrCreateTab, addAppTab)}
          onMouseEnter={() => setHoveredId(`qa-${action.label}`)}
          onMouseLeave={() => setHoveredId(null)}
          aria-label={action.label}
          title={action.label}
        >
          <Icon name={action.iconName} size={16} />
        </button>
      ))}
      <div style={{ height: "8px" }} />
    </div>
  );
}

// ─── Saved Canvases Section ──────────────────────────────────────

function SavedCanvasesSection(): React.ReactElement | null {
  const savedCanvases = useCanvasStore((s) => s.savedCanvases);
  const listLoaded = useCanvasStore((s) => s.listLoaded);
  const loadCanvasList = useCanvasStore((s) => s.loadCanvasList);
  const removeSavedCanvas = useCanvasStore((s) => s.removeSavedCanvas);
  const assignCanvas = useCanvasStore((s) => s.assignCanvas);
  const addTab = useTabStore((s) => s.addTab);
  const updateTab = useTabStore((s) => s.updateTab);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteHoveredId, setDeleteHoveredId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!listLoaded) {
      void loadCanvasList();
    }
  }, [listLoaded, loadCanvasList]);

  if (savedCanvases.length === 0) return null;

  return (
    <div style={styles.section}>
      <button
        type="button"
        style={{
          ...styles.sectionHeader,
          cursor: "pointer",
          border: "none",
          backgroundColor: "transparent",
          width: "100%",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={isExpanded ? "Collapse canvases" : "Expand canvases"}
      >
        <Icon name="canvas" size={12} />
        Canvases ({savedCanvases.length})
      </button>
      {isExpanded &&
        savedCanvases.map((canvas) => (
          <div
            key={canvas.id}
            role="button"
            tabIndex={0}
            style={{
              ...styles.tabItem,
              ...(hoveredId === canvas.id ? styles.tabItemHover : {}),
            }}
            onClick={() => {
              const tabId = addTab("canvas");
              assignCanvas(tabId, canvas.id);
              updateTab(tabId, { title: canvas.name || "Canvas" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const tabId = addTab("canvas");
                assignCanvas(tabId, canvas.id);
                updateTab(tabId, { title: canvas.name || "Canvas" });
              }
            }}
            onMouseEnter={() => setHoveredId(canvas.id)}
            onMouseLeave={() => setHoveredId(null)}
            aria-label={`Open canvas: ${canvas.name}`}
            title={canvas.name}
          >
            <Icon name="canvas" size={14} />
            <span style={styles.tabTitle}>{canvas.name}</span>
            <button
              type="button"
              aria-label={`Delete canvas: ${canvas.name}`}
              style={{
                ...styles.tabClose,
                ...(deleteHoveredId === canvas.id
                  ? { backgroundColor: "var(--mixa-bg-active)", color: "var(--mixa-text-primary)" }
                  : {}),
                opacity: hoveredId === canvas.id ? 1 : 0,
              }}
              onClick={(e) => {
                e.stopPropagation();
                removeSavedCanvas(canvas.id);
                void window.electronAPI.canvas.delete(canvas.id);
              }}
              onMouseEnter={() => setDeleteHoveredId(canvas.id)}
              onMouseLeave={() => setDeleteHoveredId(null)}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
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
  const switchOrCreateTab = useTabStore((s) => s.switchOrCreateTab);
  const addAppTab = useTabStore((s) => s.addAppTab);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [resizing, setResizing] = useState(false);
  const [collapseHovered, setCollapseHovered] = useState(false);
  const [qaHovered, setQaHovered] = useState<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const effectiveWidth = isCollapsed ? COLLAPSED_WIDTH : width;
  useEffect(() => {
    window.electronAPI.sidebar.setWidth(effectiveWidth);
  }, [effectiveWidth]);

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

  const handleContextMenu = useCallback((tabId: string, x: number, y: number) => {
    setContextMenu({ tabId, x, y });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

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
      <div style={styles.header}>
        <span style={styles.headerTitle}>Tabs</span>
        <button
          type="button"
          style={{
            ...styles.collapseButton,
            ...(collapseHovered ? { backgroundColor: "var(--mixa-bg-hover)" } : {}),
          }}
          onClick={toggle}
          onMouseEnter={() => setCollapseHovered(true)}
          onMouseLeave={() => setCollapseHovered(false)}
          aria-label="Collapse sidebar"
          title="Collapse sidebar (Cmd+B)"
        >
          <Icon name="collapse" size={16} />
        </button>
      </div>

      <div style={styles.scrollArea}>
        {TAB_TYPE_ORDER.map((type) => {
          const typeTabs = tabsByType.get(type);
          if (!typeTabs || typeTabs.length === 0) return null;

          return (
            <div key={type} style={styles.section}>
              <div style={styles.sectionHeader}>
                <Icon name={TAB_TYPE_INFO[type].icon} size={12} />
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
              padding: "24px 12px",
              color: "var(--mixa-text-muted)",
              fontSize: "13px",
              textAlign: "center",
            }}
          >
            No open tabs
          </div>
        )}

        <SavedCanvasesSection />
      </div>

      <div style={styles.quickActions}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            style={{
              ...styles.quickActionButton,
              ...(qaHovered === action.label ? { backgroundColor: "var(--mixa-bg-hover)", color: "var(--mixa-text-secondary)" } : {}),
            }}
            onClick={() => handleQuickAction(action, switchOrCreateTab, addAppTab)}
            onMouseEnter={() => setQaHovered(action.label)}
            onMouseLeave={() => setQaHovered(null)}
            aria-label={action.label}
            title={action.label}
          >
            <Icon name={action.iconName} size={14} />
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      <div
        style={{
          ...styles.resizeHandle,
          ...(resizing ? { backgroundColor: "var(--mixa-accent-primary)" } : {}),
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

      {contextMenu && (
        <ContextMenu state={contextMenu} onClose={closeContextMenu} />
      )}
    </div>
  );
}
