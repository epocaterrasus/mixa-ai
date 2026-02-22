// Knowledge toolbar — search input, view mode toggle, sort controls, filter toggle, bulk actions

import { useState, useCallback, useRef, useEffect } from "react";
import { Icon } from "@mixa-ai/ui";
import type { SortField, ViewMode, AvailableTag, AvailableProject } from "../../stores/knowledge";

interface KnowledgeToolbarProps {
  searchQuery: string;
  viewMode: ViewMode;
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  showFilters: boolean;
  totalItems: number;
  checkedCount: number;
  isSearchActive: boolean;
  availableTags: AvailableTag[];
  availableProjects: AvailableProject[];
  onSearch: (query: string) => void;
  onSetViewMode: (mode: ViewMode) => void;
  onSetSortBy: (sortBy: SortField) => void;
  onSetSortOrder: (order: "asc" | "desc") => void;
  onToggleFilters: () => void;
  onCheckAll: () => void;
  onClearChecked: () => void;
  onDeleteChecked: () => void;
}

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 16px",
  borderBottom: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "var(--mixa-bg-surface)",
  flexShrink: 0,
};

const searchContainerStyle: React.CSSProperties = {
  flex: 1,
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 12px 6px 32px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "var(--mixa-bg-base)",
  color: "var(--mixa-text-primary)",
  fontSize: "13px",
  outline: "none",
  transition: "border-color 0.15s",
};

const searchIconStyle: React.CSSProperties = {
  position: "absolute",
  left: "10px",
  display: "flex",
  alignItems: "center",
  color: "var(--mixa-text-muted)",
  pointerEvents: "none",
};

const buttonGroupStyle: React.CSSProperties = {
  display: "flex",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-subtle)",
  overflow: "hidden",
};

const viewButtonStyle: React.CSSProperties = {
  padding: "5px 8px",
  border: "none",
  backgroundColor: "transparent",
  color: "var(--mixa-text-muted)",
  fontSize: "13px",
  cursor: "pointer",
  transition: "background-color 0.1s, color 0.1s",
};

const viewButtonActiveStyle: React.CSSProperties = {
  ...viewButtonStyle,
  backgroundColor: "var(--mixa-bg-active)",
  color: "var(--mixa-text-primary)",
};

const iconButtonStyle: React.CSSProperties = {
  width: "30px",
  height: "30px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-muted)",
  fontSize: "13px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background-color 0.15s",
};

const iconButtonActiveStyle: React.CSSProperties = {
  ...iconButtonStyle,
  backgroundColor: "var(--mixa-bg-active-accent)",
  color: "var(--mixa-accent-primary)",
  borderColor: "var(--mixa-accent-primary)",
};

const sortSelectStyle: React.CSSProperties = {
  padding: "5px 8px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "var(--mixa-bg-base)",
  color: "var(--mixa-text-secondary)",
  fontSize: "12px",
  cursor: "pointer",
  outline: "none",
};

const countStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--mixa-text-muted)",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const bulkBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 16px",
  borderBottom: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "var(--mixa-bg-active-accent)",
  fontSize: "12px",
  color: "var(--mixa-text-primary)",
  flexShrink: 0,
};

const bulkButtonStyle: React.CSSProperties = {
  padding: "3px 8px",
  borderRadius: "4px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: "11px",
  cursor: "pointer",
  transition: "background-color 0.1s",
  position: "relative",
};

const bulkDeleteButtonStyle: React.CSSProperties = {
  ...bulkButtonStyle,
  color: "#ef4444",
  borderColor: "rgba(239, 68, 68, 0.3)",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  marginTop: "4px",
  minWidth: "160px",
  maxHeight: "200px",
  overflowY: "auto",
  backgroundColor: "var(--mixa-bg-elevated)",
  border: "1px solid var(--mixa-border-subtle)",
  borderRadius: "6px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  zIndex: 100,
  padding: "4px 0",
};

const dropdownItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  width: "100%",
  padding: "6px 12px",
  border: "none",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: "12px",
  cursor: "pointer",
  textAlign: "left",
};

const dropdownEmptyStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: "11px",
  color: "var(--mixa-text-muted)",
  fontStyle: "italic",
};

export function KnowledgeToolbar({
  searchQuery,
  viewMode,
  sortBy,
  sortOrder,
  showFilters,
  totalItems,
  checkedCount,
  isSearchActive,
  availableTags,
  availableProjects,
  onSearch,
  onSetViewMode,
  onSetSortBy,
  onSetSortOrder,
  onToggleFilters,
  onCheckAll,
  onClearChecked,
  onDeleteChecked,
}: KnowledgeToolbarProps): React.ReactElement {
  const [inputValue, setInputValue] = useState(searchQuery);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Keep input in sync with store (for external resets)
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearch(value);
      }, 300);
    },
    [onSearch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        onSearch(inputValue);
      }
      if (e.key === "Escape") {
        setInputValue("");
        onSearch("");
        (e.target as HTMLInputElement).blur();
      }
    },
    [inputValue, onSearch],
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (value === "newest") {
        onSetSortBy("capturedAt");
        onSetSortOrder("desc");
      } else if (value === "oldest") {
        onSetSortBy("capturedAt");
        onSetSortOrder("asc");
      } else if (value === "title-az") {
        onSetSortBy("title");
        onSetSortOrder("asc");
      } else if (value === "title-za") {
        onSetSortBy("title");
        onSetSortOrder("desc");
      } else if (value === "updated") {
        onSetSortBy("updatedAt");
        onSetSortOrder("desc");
      } else if (value === "relevant") {
        // When searching, "most relevant" keeps default search ordering
        onSetSortBy("capturedAt");
        onSetSortOrder("desc");
      }
    },
    [onSetSortBy, onSetSortOrder],
  );

  const currentSortValue =
    sortBy === "capturedAt" && sortOrder === "desc"
      ? isSearchActive ? "relevant" : "newest"
      : sortBy === "capturedAt" && sortOrder === "asc"
        ? "oldest"
        : sortBy === "title" && sortOrder === "asc"
          ? "title-az"
          : sortBy === "title" && sortOrder === "desc"
            ? "title-za"
            : "updated";

  return (
    <>
      <div style={toolbarStyle}>
        {/* Filter toggle */}
        <button
          type="button"
          style={showFilters ? iconButtonActiveStyle : iconButtonStyle}
          onClick={onToggleFilters}
          title={showFilters ? "Hide filters" : "Show filters"}
          aria-label={showFilters ? "Hide filters" : "Show filters"}
          onMouseEnter={(e) => {
            if (!showFilters) {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (!showFilters) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <Icon name="filter" size={16} />
        </button>

        {/* Search */}
        <div style={searchContainerStyle}>
          <span style={searchIconStyle}>
            <Icon name="search" size={16} />
          </span>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Search knowledge base..."
            style={searchInputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--mixa-accent-primary)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--mixa-border-subtle)";
            }}
            aria-label="Search knowledge base"
          />
        </div>

        {/* Item count */}
        <span style={countStyle}>
          {totalItems} {totalItems === 1 ? "item" : "items"}
        </span>

        {/* Sort */}
        <select
          value={currentSortValue}
          onChange={handleSortChange}
          style={sortSelectStyle}
          aria-label="Sort items"
        >
          {isSearchActive && <option value="relevant">Most relevant</option>}
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="title-az">Title A-Z</option>
          <option value="title-za">Title Z-A</option>
          <option value="updated">Recently updated</option>
        </select>

        {/* View mode toggle */}
        <div style={buttonGroupStyle}>
          <button
            type="button"
            style={viewMode === "grid" ? viewButtonActiveStyle : viewButtonStyle}
            onClick={() => onSetViewMode("grid")}
            title="Grid view"
            aria-label="Grid view"
          >
            <Icon name="layers" size={14} />
          </button>
          <button
            type="button"
            style={viewMode === "list" ? viewButtonActiveStyle : viewButtonStyle}
            onClick={() => onSetViewMode("list")}
            title="List view"
            aria-label="List view"
          >
            <Icon name="inbox" size={14} />
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {checkedCount > 0 && (
        <div style={bulkBarStyle}>
          <span style={{ fontWeight: 500 }}>
            {checkedCount} {checkedCount === 1 ? "item" : "items"} selected
          </span>
          <button
            type="button"
            style={bulkButtonStyle}
            onClick={onCheckAll}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Select all
          </button>
          <button
            type="button"
            style={bulkButtonStyle}
            onClick={onClearChecked}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Clear
          </button>

          {/* Add tag dropdown */}
          <div ref={tagDropdownRef} style={{ position: "relative" }}>
            <button
              type="button"
              style={bulkButtonStyle}
              onClick={() => {
                setShowTagDropdown(!showTagDropdown);
                setShowProjectDropdown(false);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Add tag
            </button>
            {showTagDropdown && (
              <div style={dropdownStyle}>
                {availableTags.length === 0 ? (
                  <div style={dropdownEmptyStyle}>
                    No tags available yet. Tags will appear here once items are auto-tagged.
                  </div>
                ) : (
                  availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      style={dropdownItemStyle}
                      onClick={() => setShowTagDropdown(false)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {tag.color && (
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: tag.color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      {tag.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Move to project dropdown */}
          <div ref={projectDropdownRef} style={{ position: "relative" }}>
            <button
              type="button"
              style={bulkButtonStyle}
              onClick={() => {
                setShowProjectDropdown(!showProjectDropdown);
                setShowTagDropdown(false);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Move to project
            </button>
            {showProjectDropdown && (
              <div style={dropdownStyle}>
                {availableProjects.length === 0 ? (
                  <div style={dropdownEmptyStyle}>
                    No projects yet. Create a project in Settings to organize items.
                  </div>
                ) : (
                  availableProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      style={dropdownItemStyle}
                      onClick={() => setShowProjectDropdown(false)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {project.icon && <span>{project.icon}</span>}
                      {project.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            style={bulkDeleteButtonStyle}
            onClick={onDeleteChecked}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Delete selected
          </button>
        </div>
      )}
    </>
  );
}
