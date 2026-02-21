import { useCallback, useRef, useState } from "react";
import type { Tab } from "@mixa-ai/types";
import { useTabStore } from "../stores/tabs";

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    height: "36px",
    backgroundColor: "#1a1a1a",
    borderBottom: "1px solid #2a2a2a",
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
    gap: "1px",
  } as React.CSSProperties,
  tab: {
    display: "flex",
    alignItems: "center",
    height: "28px",
    maxWidth: "200px",
    minWidth: "60px",
    padding: "0 8px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    color: "#999",
    backgroundColor: "transparent",
    border: "none",
    transition: "background-color 0.1s",
    WebkitAppRegion: "no-drag",
    flexShrink: 1,
    overflow: "hidden",
  } as React.CSSProperties,
  tabActive: {
    backgroundColor: "#2a2a2a",
    color: "#fafafa",
  } as React.CSSProperties,
  tabHover: {
    backgroundColor: "#222",
  } as React.CSSProperties,
  tabFavicon: {
    width: "14px",
    height: "14px",
    marginRight: "6px",
    flexShrink: 0,
    borderRadius: "2px",
  } as React.CSSProperties,
  tabTitle: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "left",
    lineHeight: "28px",
  } as React.CSSProperties,
  tabClose: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "16px",
    height: "16px",
    marginLeft: "4px",
    borderRadius: "3px",
    border: "none",
    backgroundColor: "transparent",
    color: "#666",
    cursor: "pointer",
    fontSize: "14px",
    lineHeight: "1",
    padding: 0,
    flexShrink: 0,
    WebkitAppRegion: "no-drag",
  } as React.CSSProperties,
  tabCloseHover: {
    backgroundColor: "#444",
    color: "#fff",
  } as React.CSSProperties,
  addButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "#888",
    cursor: "pointer",
    fontSize: "16px",
    padding: 0,
    flexShrink: 0,
    WebkitAppRegion: "no-drag",
  } as React.CSSProperties,
  loadingIndicator: {
    width: "14px",
    height: "14px",
    marginRight: "6px",
    flexShrink: 0,
    border: "2px solid #333",
    borderTopColor: "#6366f1",
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

  // Default icon per tab type
  const icons: Record<string, string> = {
    web: "\u{1F310}",
    terminal: "\u{25B6}",
    knowledge: "\u{1F4DA}",
    chat: "\u{1F4AC}",
    dashboard: "\u{1F4CA}",
    settings: "\u{2699}",
  };

  return (
    <span style={{ ...styles.tabFavicon, fontSize: "12px", textAlign: "center" as const }}>
      {icons[tab.type] ?? "\u{1F310}"}
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

  const tabStyle = {
    ...styles.tab,
    ...(tab.isActive ? styles.tabActive : {}),
    ...(hovered && !tab.isActive ? styles.tabHover : {}),
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
        ×
      </button>
    </div>
  );
}

// Drag-and-drop reorder support
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
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
        +
      </button>
    </div>
  );
}
