import { useState, useCallback } from "react";
import { Icon } from "@mixa-ai/ui";
import { useTabStore } from "../stores/tabs";
import { useAugmentedStore } from "../stores/augmented";
import { useSettingsStore } from "../stores/settings";

const EMPTY_ITEMS: never[] = [];

const styles = {
  button: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    cursor: "pointer",
    fontSize: "13px",
    padding: 0,
    flexShrink: 0,
  } as React.CSSProperties,
  badge: {
    position: "absolute",
    top: "2px",
    right: "2px",
    minWidth: "14px",
    height: "14px",
    borderRadius: "7px",
    backgroundColor: "var(--mixa-accent-primary)",
    color: "#fff",
    fontSize: "9px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 3px",
    lineHeight: 1,
  } as React.CSSProperties,
} as const;

export function AugmentedIndicator(): React.ReactElement | null {
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
  const togglePanel = useAugmentedStore((s) => s.togglePanel);
  const isPanelOpen = useAugmentedStore((s) => s.isPanelOpen);
  const [hovered, setHovered] = useState(false);

  // Only show for web tabs with augmented browsing enabled
  if (!augmentedEnabled || activeTabType !== "web") {
    return null;
  }

  const count = relatedItems.length;
  const hasRelated = count > 0;

  return (
    <button
      type="button"
      style={{
        ...styles.button,
        color: hasRelated
          ? "var(--mixa-accent-primary)"
          : "var(--mixa-text-faint)",
        ...(hovered
          ? { backgroundColor: "var(--mixa-bg-elevated)" }
          : {}),
        ...(isPanelOpen
          ? { backgroundColor: "var(--mixa-bg-active-accent)" }
          : {}),
      }}
      onClick={togglePanel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={!hasRelated}
      aria-label={
        hasRelated
          ? `${count} related item${count !== 1 ? "s" : ""} in your knowledge base`
          : "No related items found"
      }
      title={
        hasRelated
          ? `${count} related item${count !== 1 ? "s" : ""} in your knowledge base`
          : "No related items in knowledge base"
      }
    >
      <Icon name="knowledge" size={14} />
      {hasRelated && (
        <span style={styles.badge} aria-hidden="true">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
