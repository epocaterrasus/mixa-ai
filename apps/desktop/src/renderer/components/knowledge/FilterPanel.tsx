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

const dateInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "5px 8px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-base)",
  color: "var(--mixa-text-secondary)",
  fontSize: "11px",
  outline: "none",
  transition: "border-color 0.15s",
};

const ITEM_TYPES = [
  { value: "article" as const, label: "Articles", icon: "\u{1F4C4}" },
  { value: "highlight" as const, label: "Highlights", icon: "\u{1F4CC}" },
  { value: "code" as const, label: "Code", icon: "\u{1F4BB}" },
  { value: "youtube" as const, label: "YouTube", icon: "\u{1F4F9}" },
  { value: "pdf" as const, label: "PDFs", icon: "\u{1F4D1}" },
  { value: "image" as const, label: "Images", icon: "\u{1F5BC}" },
];

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

type DatePreset = "any" | "today" | "week" | "month" | "custom";

function getActiveDatePreset(dateFrom: string | undefined, dateTo: string | undefined): DatePreset {
  if (!dateFrom && !dateTo) return "any";
  if (!dateFrom) return "custom";

  const fromDate = new Date(dateFrom);
  const now = new Date();
  const diffDays = Math.round((now.getTime() - fromDate.getTime()) / 86_400_000);

  if (diffDays <= 1 && !dateTo) return "today";
  if (diffDays <= 7 && !dateTo) return "week";
  if (diffDays <= 30 && !dateTo) return "month";
  return "custom";
}

export function FilterPanel({
  filters,
  onSetFilter,
  onClearFilters,
}: FilterPanelProps): React.ReactElement {
  const hasActiveFilters =
    filters.itemType !== undefined ||
    filters.isFavorite !== undefined ||
    filters.isArchived !== false ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined;

  const handleTypeClick = useCallback(
    (type: typeof ITEM_TYPES[number]["value"]) => {
      onSetFilter("itemType", filters.itemType === type ? undefined : type);
    },
    [filters.itemType, onSetFilter],
  );

  const activeDatePreset = getActiveDatePreset(filters.dateFrom, filters.dateTo);

  const handleDatePreset = useCallback(
    (preset: DatePreset) => {
      if (preset === "any") {
        onSetFilter("dateFrom", undefined);
        onSetFilter("dateTo", undefined);
      } else if (preset === "today") {
        onSetFilter("dateFrom", daysAgoISO(1));
        onSetFilter("dateTo", undefined);
      } else if (preset === "week") {
        onSetFilter("dateFrom", daysAgoISO(7));
        onSetFilter("dateTo", undefined);
      } else if (preset === "month") {
        onSetFilter("dateFrom", daysAgoISO(30));
        onSetFilter("dateTo", undefined);
      }
    },
    [onSetFilter],
  );

  const handleDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onSetFilter("dateFrom", val ? new Date(val).toISOString() : undefined);
    },
    [onSetFilter],
  );

  const handleDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onSetFilter("dateTo", val ? new Date(`${val}T23:59:59.999Z`).toISOString() : undefined);
    },
    [onSetFilter],
  );

  // Convert ISO string to date input value (YYYY-MM-DD)
  const dateFromValue = filters.dateFrom ? filters.dateFrom.slice(0, 10) : "";
  const dateToValue = filters.dateTo ? filters.dateTo.slice(0, 10) : "";

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

      {/* Date range filter */}
      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>Date Range</div>
        <button
          type="button"
          style={activeDatePreset === "any" ? filterButtonActiveStyle : filterButtonStyle}
          onClick={() => handleDatePreset("any")}
          onMouseEnter={(e) => {
            if (activeDatePreset !== "any") {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeDatePreset !== "any") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          Any time
        </button>
        <button
          type="button"
          style={activeDatePreset === "today" ? filterButtonActiveStyle : filterButtonStyle}
          onClick={() => handleDatePreset("today")}
          onMouseEnter={(e) => {
            if (activeDatePreset !== "today") {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeDatePreset !== "today") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          Today
        </button>
        <button
          type="button"
          style={activeDatePreset === "week" ? filterButtonActiveStyle : filterButtonStyle}
          onClick={() => handleDatePreset("week")}
          onMouseEnter={(e) => {
            if (activeDatePreset !== "week") {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeDatePreset !== "week") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          This week
        </button>
        <button
          type="button"
          style={activeDatePreset === "month" ? filterButtonActiveStyle : filterButtonStyle}
          onClick={() => handleDatePreset("month")}
          onMouseEnter={(e) => {
            if (activeDatePreset !== "month") {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeDatePreset !== "month") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          This month
        </button>

        {/* Custom date inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
          <label style={{ fontSize: "10px", color: "var(--mixa-text-muted)" }}>
            From
            <input
              type="date"
              value={dateFromValue}
              onChange={handleDateFromChange}
              style={dateInputStyle}
              aria-label="Filter from date"
            />
          </label>
          <label style={{ fontSize: "10px", color: "var(--mixa-text-muted)" }}>
            To
            <input
              type="date"
              value={dateToValue}
              onChange={handleDateToChange}
              style={dateInputStyle}
              aria-label="Filter to date"
            />
          </label>
        </div>
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
