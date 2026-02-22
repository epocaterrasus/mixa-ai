// Knowledge item row — list view

import { useCallback } from "react";
import { Icon } from "@mixa-ai/ui";
import type { IconName } from "@mixa-ai/ui";
import type { KnowledgeItem } from "../../stores/knowledge";

interface ItemRowProps {
  item: KnowledgeItem;
  isChecked: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onCheck: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 16px",
  borderBottom: "1px solid var(--mixa-border-subtle)",
  cursor: "pointer",
  transition: "background-color 0.1s",
};

const rowSelectedStyle: React.CSSProperties = {
  ...rowStyle,
  backgroundColor: "var(--mixa-bg-active)",
};

const checkboxStyle: React.CSSProperties = {
  width: "16px",
  height: "16px",
  borderRadius: "3px",
  border: "1.5px solid var(--mixa-border-strong)",
  backgroundColor: "transparent",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  flexShrink: 0,
  transition: "background-color 0.15s, border-color 0.15s",
};

const checkboxCheckedStyle: React.CSSProperties = {
  ...checkboxStyle,
  backgroundColor: "var(--mixa-accent-primary)",
  borderColor: "var(--mixa-accent-primary)",
  color: "#fff",
};

const faviconStyle: React.CSSProperties = {
  width: "16px",
  height: "16px",
  borderRadius: "3px",
  flexShrink: 0,
};

const iconPlaceholderStyle: React.CSSProperties = {
  width: "16px",
  height: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const titleCellStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: "6px",
  overflow: "hidden",
};

const titleTextStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--mixa-text-primary)",
};

const inlineTagStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "3px",
  fontSize: "10px",
  padding: "1px 5px",
  borderRadius: "8px",
  backgroundColor: "var(--mixa-bg-active)",
  color: "var(--mixa-text-muted)",
  flexShrink: 0,
  whiteSpace: "nowrap",
};

const domainCellStyle: React.CSSProperties = {
  width: "140px",
  flexShrink: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "13px",
  color: "var(--mixa-text-muted)",
};

const typeCellStyle: React.CSSProperties = {
  width: "80px",
  flexShrink: 0,
  fontSize: "11px",
  padding: "2px 6px",
  borderRadius: "4px",
  backgroundColor: "var(--mixa-bg-active)",
  color: "var(--mixa-text-secondary)",
  textTransform: "capitalize",
  textAlign: "center",
};

const dateCellStyle: React.CSSProperties = {
  width: "80px",
  flexShrink: 0,
  fontSize: "13px",
  color: "var(--mixa-text-muted)",
  textAlign: "right",
};

const favoriteButtonStyle: React.CSSProperties = {
  width: "24px",
  height: "24px",
  border: "none",
  backgroundColor: "transparent",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  color: "var(--mixa-text-muted)",
  flexShrink: 0,
  borderRadius: "4px",
  transition: "background-color 0.1s",
};

function itemTypeIconName(type: string): IconName {
  switch (type) {
    case "article": return "article";
    case "highlight": return "highlight";
    case "youtube": return "youtube";
    case "pdf": return "pdf";
    case "code": return "code";
    case "image": return "image";
    case "terminal": return "terminal";
    default: return "article";
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ItemRow({
  item,
  isChecked,
  isSelected,
  onSelect,
  onCheck,
  onToggleFavorite,
}: ItemRowProps): React.ReactElement {
  const handleClick = useCallback(() => {
    onSelect(item.id);
  }, [item.id, onSelect]);

  const handleCheck = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCheck(item.id);
    },
    [item.id, onCheck],
  );

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFavorite(item.id);
    },
    [item.id, onToggleFavorite],
  );

  return (
    <div
      style={isSelected ? rowSelectedStyle : rowStyle}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item.id);
        }
      }}
      aria-label={`View ${item.title}`}
    >
      {/* Checkbox */}
      <div
        style={isChecked ? checkboxCheckedStyle : checkboxStyle}
        onClick={handleCheck}
        role="checkbox"
        aria-checked={isChecked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onCheck(item.id);
          }
        }}
      >
        {isChecked ? <Icon name="check" size={10} /> : null}
      </div>

      {/* Icon */}
      {item.faviconUrl ? (
        <img src={item.faviconUrl} alt="" style={faviconStyle} />
      ) : (
        <div style={iconPlaceholderStyle}>
          <Icon name={itemTypeIconName(item.itemType)} size={14} />
        </div>
      )}

      {/* Title + Tags */}
      <div style={titleCellStyle}>
        <span style={titleTextStyle}>{item.title}</span>
        {item.tags.slice(0, 2).map((tag) => (
          <span key={tag.id} style={inlineTagStyle}>
            {tag.color && (
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  backgroundColor: tag.color,
                  flexShrink: 0,
                }}
              />
            )}
            {tag.name}
          </span>
        ))}
        {item.tags.length > 2 && (
          <span style={inlineTagStyle}>+{item.tags.length - 2}</span>
        )}
      </div>

      {/* Domain */}
      <div style={domainCellStyle}>{item.domain ?? "local"}</div>

      {/* Type */}
      <div style={typeCellStyle}>{item.itemType}</div>

      {/* Date */}
      <div style={dateCellStyle}>{formatDate(item.capturedAt)}</div>

      {/* Favorite */}
      <button
        type="button"
        style={{
          ...favoriteButtonStyle,
          color: item.isFavorite ? "#f59e0b" : "var(--mixa-text-muted)",
        }}
        onClick={handleFavorite}
        title={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <Icon name="favorite" size={14} fill={item.isFavorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
