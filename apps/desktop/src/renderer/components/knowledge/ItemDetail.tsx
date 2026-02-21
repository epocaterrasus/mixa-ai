// Knowledge item detail panel — shown when an item is selected

import { useCallback } from "react";
import type { KnowledgeItem } from "../../stores/knowledge";

interface ItemDetailProps {
  item: KnowledgeItem;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDelete: (ids: string[]) => void;
}

const panelStyle: React.CSSProperties = {
  width: "400px",
  borderLeft: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-surface)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flexShrink: 0,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderBottom: "1px solid var(--mixa-border-default)",
  flexShrink: 0,
};

const closeButtonStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "transparent",
  color: "var(--mixa-text-muted)",
  fontSize: "16px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background-color 0.15s",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "4px",
};

const actionButtonStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "4px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: "11px",
  cursor: "pointer",
  transition: "background-color 0.15s",
};

const deleteButtonStyle: React.CSSProperties = {
  ...actionButtonStyle,
  color: "#ef4444",
  borderColor: "rgba(239, 68, 68, 0.3)",
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "var(--mixa-text-primary)",
  lineHeight: 1.3,
  wordBreak: "break-word",
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  fontSize: "12px",
  color: "var(--mixa-text-muted)",
};

const metaItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--mixa-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "4px",
};

const excerptStyle: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: 1.6,
  color: "var(--mixa-text-secondary)",
  wordBreak: "break-word",
};

const urlLinkStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--mixa-accent-primary)",
  textDecoration: "none",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  display: "block",
};

const contentBodyStyle: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: 1.7,
  color: "var(--mixa-text-primary)",
  wordBreak: "break-word",
  maxHeight: "400px",
  overflowY: "auto",
  padding: "12px",
  backgroundColor: "var(--mixa-bg-base)",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-subtle)",
};

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatReadingTime(minutes: number | null): string {
  if (minutes === null) return "";
  if (minutes < 1) return "<1 min read";
  return `${minutes} min read`;
}

export function ItemDetail({
  item,
  onClose,
  onToggleFavorite,
  onToggleArchive,
  onDelete,
}: ItemDetailProps): React.ReactElement {
  const handleDelete = useCallback(() => {
    onDelete([item.id]);
  }, [item.id, onDelete]);

  const handleFavorite = useCallback(() => {
    onToggleFavorite(item.id);
  }, [item.id, onToggleFavorite]);

  const handleArchive = useCallback(() => {
    onToggleArchive(item.id);
  }, [item.id, onToggleArchive]);

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={actionsStyle}>
          <button
            type="button"
            style={actionButtonStyle}
            onClick={handleFavorite}
            title={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {item.isFavorite ? "\u2605 Favorited" : "\u2606 Favorite"}
          </button>
          <button
            type="button"
            style={actionButtonStyle}
            onClick={handleArchive}
            title={item.isArchived ? "Unarchive" : "Archive"}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {item.isArchived ? "Unarchive" : "Archive"}
          </button>
          <button
            type="button"
            style={deleteButtonStyle}
            onClick={handleDelete}
            title="Delete item"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Delete
          </button>
        </div>
        <button
          type="button"
          style={closeButtonStyle}
          onClick={onClose}
          title="Close detail panel"
          aria-label="Close detail panel"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {"\u2715"}
        </button>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Thumbnail */}
        {item.thumbnailUrl && (
          <img
            src={item.thumbnailUrl}
            alt=""
            style={{
              width: "100%",
              height: "180px",
              objectFit: "cover",
              borderRadius: "6px",
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        {/* Title */}
        <div style={titleStyle}>{item.title}</div>

        {/* URL */}
        {item.url && (
          <a
            href={item.url}
            style={urlLinkStyle}
            title={item.url}
            onClick={(e) => e.preventDefault()}
          >
            {item.url}
          </a>
        )}

        {/* Meta row */}
        <div style={metaRowStyle}>
          {item.domain && (
            <div style={metaItemStyle}>
              {item.faviconUrl && (
                <img
                  src={item.faviconUrl}
                  alt=""
                  style={{ width: "12px", height: "12px", borderRadius: "2px" }}
                />
              )}
              <span>{item.domain}</span>
            </div>
          )}
          <div style={metaItemStyle}>
            <span style={{ textTransform: "capitalize" }}>{item.itemType}</span>
          </div>
          {item.wordCount !== null && (
            <div style={metaItemStyle}>
              <span>{item.wordCount.toLocaleString()} words</span>
            </div>
          )}
          {item.readingTime !== null && (
            <div style={metaItemStyle}>
              <span>{formatReadingTime(item.readingTime)}</span>
            </div>
          )}
        </div>

        {/* Captured date */}
        <div>
          <div style={sectionTitleStyle}>Captured</div>
          <div style={{ fontSize: "12px", color: "var(--mixa-text-secondary)" }}>
            {formatFullDate(item.capturedAt)}
          </div>
        </div>

        {/* Description / Excerpt */}
        {item.description && (
          <div>
            <div style={sectionTitleStyle}>Summary</div>
            <div style={excerptStyle}>{item.description}</div>
          </div>
        )}

        {/* Full content preview */}
        {item.contentText && (
          <div>
            <div style={sectionTitleStyle}>Content</div>
            <div style={contentBodyStyle}>
              {item.contentText.length > 2000
                ? `${item.contentText.slice(0, 2000)}...`
                : item.contentText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
