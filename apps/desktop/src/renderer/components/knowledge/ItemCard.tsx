// Knowledge item card — grid view

import { useCallback } from "react";
import type { KnowledgeItem } from "../../stores/knowledge";

interface ItemCardProps {
  item: KnowledgeItem;
  isChecked: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onCheck: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  borderRadius: "8px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-surface)",
  overflow: "hidden",
  cursor: "pointer",
  transition: "border-color 0.15s, box-shadow 0.15s",
  position: "relative",
};

const cardSelectedStyle: React.CSSProperties = {
  ...cardStyle,
  borderColor: "var(--mixa-accent-primary)",
  boxShadow: "0 0 0 1px var(--mixa-accent-primary)",
};

const thumbnailStyle: React.CSSProperties = {
  width: "100%",
  height: "140px",
  backgroundColor: "var(--mixa-bg-elevated)",
  objectFit: "cover",
  display: "block",
};

const thumbnailPlaceholderStyle: React.CSSProperties = {
  ...thumbnailStyle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
  color: "var(--mixa-text-muted)",
};

const bodyStyle: React.CSSProperties = {
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  flex: 1,
};

const titleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--mixa-text-primary)",
  lineHeight: 1.3,
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  wordBreak: "break-word",
};

const excerptStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--mixa-text-secondary)",
  lineHeight: 1.4,
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
};

const metaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: "11px",
  color: "var(--mixa-text-muted)",
  marginTop: "auto",
  paddingTop: "6px",
};

const domainStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "60%",
};

const faviconStyle: React.CSSProperties = {
  width: "12px",
  height: "12px",
  borderRadius: "2px",
  flexShrink: 0,
};

const checkboxStyle: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  left: "8px",
  width: "18px",
  height: "18px",
  borderRadius: "4px",
  border: "1.5px solid var(--mixa-border-strong)",
  backgroundColor: "var(--mixa-bg-surface)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
  zIndex: 1,
  transition: "background-color 0.15s, border-color 0.15s",
};

const checkboxCheckedStyle: React.CSSProperties = {
  ...checkboxStyle,
  backgroundColor: "var(--mixa-accent-primary)",
  borderColor: "var(--mixa-accent-primary)",
  color: "#fff",
};

const favoriteStyle: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  right: "8px",
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  border: "none",
  backgroundColor: "rgba(0,0,0,0.4)",
  color: "#fff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  zIndex: 1,
};

const typeBadgeStyle: React.CSSProperties = {
  fontSize: "10px",
  padding: "1px 6px",
  borderRadius: "4px",
  backgroundColor: "var(--mixa-bg-active)",
  color: "var(--mixa-text-secondary)",
  textTransform: "capitalize",
  flexShrink: 0,
};

function itemTypeIcon(type: string): string {
  switch (type) {
    case "article": return "\u{1F4C4}";
    case "highlight": return "\u{1F4CC}";
    case "youtube": return "\u{1F4F9}";
    case "pdf": return "\u{1F4D1}";
    case "code": return "\u{1F4BB}";
    case "image": return "\u{1F5BC}";
    case "terminal": return "\u{2328}";
    default: return "\u{1F4C4}";
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

export function ItemCard({
  item,
  isChecked,
  isSelected,
  onSelect,
  onCheck,
  onToggleFavorite,
}: ItemCardProps): React.ReactElement {
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
      style={isSelected ? cardSelectedStyle : cardStyle}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "var(--mixa-border-strong)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "var(--mixa-border-default)";
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
        {isChecked ? "\u2713" : ""}
      </div>

      {/* Favorite */}
      <button
        type="button"
        style={favoriteStyle}
        onClick={handleFavorite}
        title={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        {item.isFavorite ? "\u2605" : "\u2606"}
      </button>

      {/* Thumbnail */}
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt=""
          style={thumbnailStyle}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const placeholder = e.currentTarget.nextElementSibling;
            if (placeholder instanceof HTMLElement) {
              placeholder.style.display = "flex";
            }
          }}
        />
      ) : null}
      <div
        style={{
          ...thumbnailPlaceholderStyle,
          display: item.thumbnailUrl ? "none" : "flex",
        }}
      >
        {itemTypeIcon(item.itemType)}
      </div>

      {/* Body */}
      <div style={bodyStyle}>
        <div style={titleStyle}>{item.title}</div>
        {item.description && <div style={excerptStyle}>{item.description}</div>}
        <div style={metaStyle}>
          <div style={domainStyle}>
            {item.faviconUrl && (
              <img src={item.faviconUrl} alt="" style={faviconStyle} />
            )}
            <span>{item.domain ?? "local"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={typeBadgeStyle}>{item.itemType}</span>
            <span>{formatDate(item.capturedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
