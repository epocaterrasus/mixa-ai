// Knowledge filter sidebar panel

import { useCallback } from "react";
import type { KnowledgeFilters } from "../../stores/knowledge";

interface FilterPanelProps {
  filters: KnowledgeFilters;
  onSetFilter: <K extends keyof KnowledgeFilters>(key: K, value: KnowledgeFilters[K]) => void;
  onClearFilters: () => void;
}

const panelStyle: React.CSSProperties = {
  width: "200px",
  borderRight: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-surface)",
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  overflowY: "auto",
  flexShrink: 0,
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--mixa-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const filterButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 8px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: "12px",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  transition: "background-color 0.1s",
};

const filterButtonActiveStyle: React.CSSProperties = {
  ...filterButtonStyle,
  backgroundColor: "var(--mixa-bg-active-accent)",
  color: "var(--mixa-accent-primary)",
  fontWeight: 500,
};

const clearButtonStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-muted)",
  fontSize: "11px",
  cursor: "pointer",
  transition: "background-color 0.15s",
};

const ITEM_TYPES = [
  { value: "article" as const, label: "Articles", icon: "\u{1F4C4}" },
  { value: "highlight" as const, label: "Highlights", icon: "\u{1F4CC}" },
  { value: "code" as const, label: "Code", icon: "\u{1F4BB}" },
  { value: "youtube" as const, label: "YouTube", icon: "\u{1F4F9}" },
  { value: "pdf" as const, label: "PDFs", icon: "\u{1F4D1}" },
  { value: "image" as const, label: "Images", icon: "\u{1F5BC}" },
];

export function FilterPanel({
  filters,
  onSetFilter,
  onClearFilters,
}: FilterPanelProps): React.ReactElement {
  const hasActiveFilters =
    filters.itemType !== undefined ||
    filters.isFavorite !== undefined ||
    filters.isArchived !== false;

  const handleTypeClick = useCallback(
    (type: typeof ITEM_TYPES[number]["value"]) => {
      onSetFilter("itemType", filters.itemType === type ? undefined : type);
    },
    [filters.itemType, onSetFilter],
  );

  return (
    <div style={panelStyle}>
      {/* Type filter */}
      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>Type</div>
        <button
          type="button"
          style={filters.itemType === undefined ? filterButtonActiveStyle : filterButtonStyle}
          onClick={() => onSetFilter("itemType", undefined)}
          onMouseEnter={(e) => {
            if (filters.itemType !== undefined) {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (filters.itemType !== undefined) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          All types
        </button>
        {ITEM_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            style={
              filters.itemType === type.value
                ? filterButtonActiveStyle
                : filterButtonStyle
            }
            onClick={() => handleTypeClick(type.value)}
            onMouseEnter={(e) => {
              if (filters.itemType !== type.value) {
                e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (filters.itemType !== type.value) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <span>{type.icon}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>Status</div>
        <button
          type="button"
          style={
            filters.isFavorite === true
              ? filterButtonActiveStyle
              : filterButtonStyle
          }
          onClick={() =>
            onSetFilter("isFavorite", filters.isFavorite === true ? undefined : true)
          }
          onMouseEnter={(e) => {
            if (filters.isFavorite !== true) {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (filters.isFavorite !== true) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <span>{"\u2605"}</span>
          <span>Favorites</span>
        </button>
        <button
          type="button"
          style={
            filters.isArchived === true
              ? filterButtonActiveStyle
              : filterButtonStyle
          }
          onClick={() =>
            onSetFilter("isArchived", filters.isArchived === true ? false : true)
          }
          onMouseEnter={(e) => {
            if (filters.isArchived !== true) {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (filters.isArchived !== true) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <span>{"\u{1F4E6}"}</span>
          <span>Archived</span>
        </button>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          type="button"
          style={clearButtonStyle}
          onClick={onClearFilters}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
