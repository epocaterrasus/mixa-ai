// Knowledge filter sidebar panel

import { useCallback, useEffect } from "react";
import { Icon } from "@mixa-ai/ui";
import type { IconName } from "@mixa-ai/ui";
import type { KnowledgeFilters, AvailableTag, AvailableProject } from "../../stores/knowledge";

interface FilterPanelProps {
  filters: KnowledgeFilters;
  availableTags: AvailableTag[];
  availableProjects: AvailableProject[];
  onSetFilter: <K extends keyof KnowledgeFilters>(key: K, value: KnowledgeFilters[K]) => void;
  onClearFilters: () => void;
  onLoadTags: () => Promise<void>;
  onLoadProjects: () => Promise<void>;
}

const panelStyle: React.CSSProperties = {
  width: "200px",
  borderRight: "1px solid var(--mixa-border-subtle)",
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
  fontSize: "12px",
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
  fontSize: "13px",
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
  border: "1px solid var(--mixa-border-subtle)",
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
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "var(--mixa-bg-base)",
  color: "var(--mixa-text-secondary)",
  fontSize: "11px",
  outline: "none",
  transition: "border-color 0.15s",
};

const emptyHintStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--mixa-text-muted)",
  fontStyle: "italic",
  padding: "4px 8px",
};

const tagChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "3px 8px",
  borderRadius: "10px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: "11px",
  cursor: "pointer",
  transition: "background-color 0.1s, border-color 0.1s",
};

const tagChipActiveStyle: React.CSSProperties = {
  ...tagChipStyle,
  backgroundColor: "var(--mixa-bg-active-accent)",
  borderColor: "var(--mixa-accent-primary)",
  color: "var(--mixa-accent-primary)",
  fontWeight: 500,
};

const ITEM_TYPES: { value: "article" | "highlight" | "code" | "youtube" | "pdf" | "image"; label: string; icon: IconName }[] = [
  { value: "article", label: "Articles", icon: "article" },
  { value: "highlight", label: "Highlights", icon: "highlight" },
  { value: "code", label: "Code", icon: "code" },
  { value: "youtube", label: "YouTube", icon: "youtube" },
  { value: "pdf", label: "PDFs", icon: "pdf" },
  { value: "image", label: "Images", icon: "image" },
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
  availableTags,
  availableProjects,
  onSetFilter,
  onClearFilters,
  onLoadTags,
  onLoadProjects,
}: FilterPanelProps): React.ReactElement {
  // Load tags and projects when the panel mounts
  useEffect(() => {
    void onLoadTags();
    void onLoadProjects();
  }, [onLoadTags, onLoadProjects]);

  const hasActiveFilters =
    filters.itemType !== undefined ||
    filters.isFavorite !== undefined ||
    filters.isArchived !== false ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    filters.tagIds.length > 0 ||
    filters.projectId !== undefined;

  const handleTypeClick = useCallback(
    (type: typeof ITEM_TYPES[number]["value"]) => {
      onSetFilter("itemType", filters.itemType === type ? undefined : type);
    },
    [filters.itemType, onSetFilter],
  );

  const handleTagClick = useCallback(
    (tagId: string) => {
      const current = filters.tagIds;
      if (current.includes(tagId)) {
        onSetFilter("tagIds", current.filter((id) => id !== tagId));
      } else {
        onSetFilter("tagIds", [...current, tagId]);
      }
    },
    [filters.tagIds, onSetFilter],
  );

  const handleProjectClick = useCallback(
    (projectId: string) => {
      onSetFilter("projectId", filters.projectId === projectId ? undefined : projectId);
    },
    [filters.projectId, onSetFilter],
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
            <Icon name={type.icon} size={14} />
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      {/* Tags filter */}
      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>Tags</div>
        {availableTags.length === 0 ? (
          <div style={emptyHintStyle}>No tags yet</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                style={filters.tagIds.includes(tag.id) ? tagChipActiveStyle : tagChipStyle}
                onClick={() => handleTagClick(tag.id)}
                onMouseEnter={(e) => {
                  if (!filters.tagIds.includes(tag.id)) {
                    e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!filters.tagIds.includes(tag.id)) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {tag.color && (
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: tag.color,
                      flexShrink: 0,
                    }}
                  />
                )}
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Projects filter */}
      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>Projects</div>
        {availableProjects.length === 0 ? (
          <div style={emptyHintStyle}>No projects yet</div>
        ) : (
          <>
            <button
              type="button"
              style={filters.projectId === undefined ? filterButtonActiveStyle : filterButtonStyle}
              onClick={() => onSetFilter("projectId", undefined)}
              onMouseEnter={(e) => {
                if (filters.projectId !== undefined) {
                  e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (filters.projectId !== undefined) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              All projects
            </button>
            {availableProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                style={
                  filters.projectId === project.id
                    ? filterButtonActiveStyle
                    : filterButtonStyle
                }
                onClick={() => handleProjectClick(project.id)}
                onMouseEnter={(e) => {
                  if (filters.projectId !== project.id) {
                    e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (filters.projectId !== project.id) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {project.icon && <span>{project.icon}</span>}
                <span>{project.name}</span>
              </button>
            ))}
          </>
        )}
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
          <Icon name="favorite" size={14} />
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
          <Icon name="archive" size={14} />
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
