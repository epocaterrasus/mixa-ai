import { useCallback, useRef, useState } from "react";
import type { Tab, TabType } from "@mixa-ai/types";
import { Icon } from "@mixa-ai/ui";
import type { IconName } from "@mixa-ai/ui";
import { useTabStore } from "../stores/tabs";

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

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    height: "38px",
    backgroundColor: "var(--mixa-bg-surface)",
    paddingLeft: "4px",
    paddingRight: "4px",
    WebkitAppRegion: "drag",
    userSelect: "none",
    overflow: "hidden",
  } as React.CSSProperties,
  tabList: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    overflow: "hidden",
    gap: "2px",
  } as React.CSSProperties,
  tab: {
    display: "flex",
    alignItems: "center",
    height: "30px",
    maxWidth: "200px",
    minWidth: "60px",
    padding: "0 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    color: "var(--mixa-text-muted)",
    backgroundColor: "transparent",
    border: "none",
    transition: "background-color 100ms",
    WebkitAppRegion: "no-drag",
    flexShrink: 1,
    overflow: "hidden",
  } as React.CSSProperties,
  tabActive: {
    backgroundColor: "var(--mixa-bg-active)",
    color: "var(--mixa-text-primary)",
  } as React.CSSProperties,
  tabHover: {
    backgroundColor: "var(--mixa-bg-hover)",
  } as React.CSSProperties,
  tabFavicon: {
    width: "16px",
    height: "16px",
    marginRight: "8px",
    flexShrink: 0,
    borderRadius: "2px",
  } as React.CSSProperties,
  tabTitle: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "left",
    lineHeight: "1.3",
  } as React.CSSProperties,
  tabClose: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "18px",
    height: "18px",
    marginLeft: "4px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-muted)",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    WebkitAppRegion: "no-drag",
  } as React.CSSProperties,
  tabCloseHover: {
    backgroundColor: "var(--mixa-bg-active)",
    color: "var(--mixa-text-primary)",
  } as React.CSSProperties,
  addButton: {
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
    padding: 0,
    flexShrink: 0,
    WebkitAppRegion: "no-drag",
  } as React.CSSProperties,
  loadingIndicator: {
    width: "14px",
    height: "14px",
    marginRight: "8px",
    flexShrink: 0,
    border: "2px solid var(--mixa-border-default)",
    borderTopColor: "var(--mixa-accent-primary)",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  } as React.CSSProperties,
} as const;

function TabIcon({ tab }: { tab: Tab }): React.ReactElement {
  if (tab.state === "loading") {
    return <div style={styles.loadingIndicator} />;
  }

  if (tab.faviconUrl) {
    return (
      <img
        src={tab.faviconUrl}
        alt=""
        style={styles.tabFavicon}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  return (
    <span style={{ marginRight: "8px", flexShrink: 0, display: "flex" }}>
      <Icon name={TAB_TYPE_ICONS[tab.type] ?? "web"} size={14} />
    </span>
  );
}

function TabItem({ tab }: { tab: Tab }): React.ReactElement {
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

  const handleMiddleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(tab.id);
      }
    },
    [closeTab, tab.id],
  );

  const isAppTab = tab.type === "app";
  const tabStyle: React.CSSProperties = {
    ...styles.tab,
    ...(tab.isActive ? styles.tabActive : {}),
    ...(hovered && !tab.isActive ? styles.tabHover : {}),
    ...(isAppTab ? { borderLeft: "2px solid var(--mixa-accent-primary)", paddingLeft: "8px" } : {}),
  };

  return (
    <div
      role="tab"
      aria-selected={tab.isActive}
      aria-label={tab.title}
      tabIndex={0}
      style={tabStyle}
      onClick={handleClick}
      onMouseDown={handleMiddleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
    >
      <TabIcon tab={tab} />
      <span style={styles.tabTitle}>{tab.title}</span>
      <button
        type="button"
        aria-label={`Close ${tab.title}`}
        style={{
          ...styles.tabClose,
          ...(closeHovered ? styles.tabCloseHover : {}),
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

function DraggableTabItem({
  tab,
  index,
}: {
  tab: Tab;
  index: number;
}): React.ReactElement {
  const moveTab = useTabStore((s) => s.moveTab);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
    },
    [index],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
      if (!isNaN(fromIndex) && fromIndex !== index) {
        moveTab(fromIndex, index);
      }
    },
    [index, moveTab],
  );

  return (
    <div
      ref={dragRef}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <TabItem tab={tab} />
    </div>
  );
}

export function TabBar(): React.ReactElement {
  const tabs = useTabStore((s) => s.tabs);
  const addTab = useTabStore((s) => s.addTab);

  const handleAddTab = useCallback(() => {
    addTab("web");
  }, [addTab]);

  return (
    <div style={styles.container} role="tablist" aria-label="Browser tabs">
      <div style={styles.tabList}>
        {tabs.map((tab, index) => (
          <DraggableTabItem key={tab.id} tab={tab} index={index} />
        ))}
      </div>
      <button
        type="button"
        style={styles.addButton}
        onClick={handleAddTab}
        aria-label="New tab"
        title="New tab (Cmd+T)"
      >
        <Icon name="add" size={16} />
      </button>
    </div>
  );
}
