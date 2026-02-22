import { useCallback, useState } from "react";
import { Icon } from "@mixa-ai/ui";
import { useTabStore } from "../stores/tabs";
import {
  useAugmentedStore,
  type AugmentedRelatedItem,
} from "../stores/augmented";
import { useSettingsStore } from "../stores/settings";

const EMPTY_ITEMS: never[] = [];

const styles = {
  overlay: {
    position: "fixed",
    top: "74px", // Below tab bar + toolbar
    right: 0,
    bottom: 0,
    width: "340px",
    backgroundColor: "var(--mixa-bg-surface)",
    borderLeft: "1px solid var(--mixa-border-subtle)",
    display: "flex",
    flexDirection: "column",
    zIndex: 100,
    boxShadow: "var(--mixa-shadow-overlay)",
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid var(--mixa-border-subtle)",
    flexShrink: 0,
  } as React.CSSProperties,
  headerTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--mixa-text-primary)",
  } as React.CSSProperties,
  headerCount: {
    fontSize: "11px",
    color: "var(--mixa-text-muted)",
    marginLeft: "6px",
  } as React.CSSProperties,
  closeButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-muted)",
    cursor: "pointer",
    fontSize: "16px",
    padding: 0,
  } as React.CSSProperties,
  scrollArea: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
  } as React.CSSProperties,
  itemCard: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "10px 16px",
    cursor: "pointer",
    border: "none",
    backgroundColor: "transparent",
    width: "100%",
    textAlign: "left",
  } as React.CSSProperties,
  itemCardHover: {
    backgroundColor: "var(--mixa-bg-elevated)",
  } as React.CSSProperties,
  itemHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  } as React.CSSProperties,
  itemFavicon: {
    width: "14px",
    height: "14px",
    borderRadius: "2px",
    flexShrink: 0,
  } as React.CSSProperties,
  itemTitle: {
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--mixa-text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  } as React.CSSProperties,
  itemMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "10px",
    color: "var(--mixa-text-disabled)",
  } as React.CSSProperties,
  itemSummary: {
    fontSize: "13px",
    color: "var(--mixa-text-muted)",
    lineHeight: "1.4",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  } as React.CSSProperties,
  relevanceBadge: {
    fontSize: "9px",
    fontWeight: 600,
    padding: "1px 4px",
    borderRadius: "3px",
    backgroundColor: "var(--mixa-bg-elevated)",
    color: "var(--mixa-text-tertiary)",
  } as React.CSSProperties,
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    color: "var(--mixa-text-subtle)",
    fontSize: "13px",
    textAlign: "center",
    gap: "8px",
  } as React.CSSProperties,
  separator: {
    height: "1px",
    backgroundColor: "var(--mixa-border-subtle)",
    margin: "0 16px",
  } as React.CSSProperties,
} as const;

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function relevanceLabel(score: number): string {
  if (score >= 0.9) return "Exact match";
  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
}

function RelatedItemCard({
  item,
  onOpen,
}: {
  item: AugmentedRelatedItem;
  onOpen: (item: AugmentedRelatedItem) => void;
}): React.ReactElement {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      style={{
        ...styles.itemCard,
        ...(hovered ? styles.itemCardHover : {}),
      }}
      onClick={() => onOpen(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Open ${item.title}`}
    >
      <div style={styles.itemHeader}>
        {item.faviconUrl ? (
          <img
            src={item.faviconUrl}
            alt=""
            style={styles.itemFavicon}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span style={{ ...styles.itemFavicon, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={item.itemType === "highlight" ? "highlight" : "article"} size={14} />
          </span>
        )}
        <span style={styles.itemTitle}>{item.title}</span>
      </div>
      {item.summary && (
        <div style={styles.itemSummary}>{item.summary}</div>
      )}
      <div style={styles.itemMeta}>
        <span style={styles.relevanceBadge}>{relevanceLabel(item.score)}</span>
        {item.domain && <span>{item.domain}</span>}
        <span>{formatDate(item.capturedAt)}</span>
      </div>
    </button>
  );
}

export function RelatedItemsPanel(): React.ReactElement | null {
  const isPanelOpen = useAugmentedStore((s) => s.isPanelOpen);
  const closePanel = useAugmentedStore((s) => s.closePanel);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeTabType = useTabStore(
    useCallback((s) => {
      const id = s.activeTabId;
      const tab = s.tabs.find((t) => t.id === id);
      return tab?.type ?? null;
    }, []),
  );
  const augmentedEnabled = useSettingsStore(
    (s) => s.settings?.augmentedBrowsingEnabled ?? true,
  );
  const relatedItems = useAugmentedStore(
    useCallback(
      (s) => (activeTabId ? (s.relatedByTab[activeTabId] ?? EMPTY_ITEMS) : EMPTY_ITEMS),
      [activeTabId],
    ),
  );
  const addTab = useTabStore((s) => s.addTab);
  const [closeHovered, setCloseHovered] = useState(false);

  const handleOpenItem = useCallback(
    (item: AugmentedRelatedItem) => {
      // Open the related item in a new knowledge tab or web tab
      if (item.url) {
        addTab("web", item.url);
      } else {
        addTab("knowledge");
      }
    },
    [addTab],
  );

  if (!isPanelOpen || !augmentedEnabled || activeTabType !== "web") {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.header}>
        <div>
          <span style={styles.headerTitle}>Related in Knowledge Base</span>
          <span style={styles.headerCount}>
            {relatedItems.length} item{relatedItems.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          type="button"
          style={{
            ...styles.closeButton,
            ...(closeHovered ? { backgroundColor: "var(--mixa-bg-elevated)" } : {}),
          }}
          onClick={closePanel}
          onMouseEnter={() => setCloseHovered(true)}
          onMouseLeave={() => setCloseHovered(false)}
          aria-label="Close related items panel"
          title="Close"
        >
          {"\u00D7"}
        </button>
      </div>
      <div style={styles.scrollArea}>
        {relatedItems.length > 0 ? (
          relatedItems.map((item, index) => (
            <div key={item.id}>
              {index > 0 && <div style={styles.separator} />}
              <RelatedItemCard item={item} onOpen={handleOpenItem} />
            </div>
          ))
        ) : (
          <div style={styles.emptyState}>
            <span style={{ fontSize: "24px" }}>{"\u{1F4D6}"}</span>
            <span>No related items found for this page.</span>
            <span style={{ fontSize: "11px", color: "var(--mixa-text-disabled)" }}>
              Save pages with Cmd+S to build your knowledge base.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
