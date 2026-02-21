// @mixa-ai/terminal-renderer — Table component
// Renders sortable, filterable data tables from UIComponent data

import { useCallback, useMemo, useState } from "react";
import type { UIComponent, UIEvent } from "@mixa-ai/types";
import { token, spacing, typography, radii } from "../styles.js";

export interface TableProps {
  component: UIComponent;
  onEvent?: (event: UIEvent) => void;
  module: string;
}

type SortDirection = "asc" | "desc" | "none";

interface SortState {
  columnKey: string;
  direction: SortDirection;
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: typography.fontSize.sm,
  fontFamily: typography.fontFamily.sans,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: `${spacing[2]} ${spacing[3]}`,
  color: token("textMuted"),
  fontWeight: typography.fontWeight.medium,
  fontSize: typography.fontSize.xs,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: `1px solid ${token("borderDefault")}`,
  backgroundColor: token("bgSurface"),
  position: "sticky",
  top: 0,
  userSelect: "none",
};

const thSortableStyle: React.CSSProperties = {
  ...thStyle,
  cursor: "pointer",
};

const tdStyle: React.CSSProperties = {
  padding: `${spacing[2]} ${spacing[3]}`,
  color: token("textPrimary"),
  borderBottom: `1px solid ${token("borderSubtle")}`,
  fontFamily: typography.fontFamily.mono,
  fontSize: typography.fontSize.sm,
};

const filterInputStyle: React.CSSProperties = {
  width: "100%",
  padding: `${spacing[1]} ${spacing[2]}`,
  marginBottom: spacing[2],
  backgroundColor: token("bgElevated"),
  border: `1px solid ${token("borderDefault")}`,
  borderRadius: radii.md,
  color: token("textPrimary"),
  fontSize: typography.fontSize.sm,
  fontFamily: typography.fontFamily.sans,
  outline: "none",
};

const wrapperStyle: React.CSSProperties = {
  overflow: "auto",
  borderRadius: radii.lg,
  border: `1px solid ${token("borderDefault")}`,
  backgroundColor: token("bgSurface"),
};

function getSortIndicator(direction: SortDirection): string {
  switch (direction) {
    case "asc":
      return " \u2191";
    case "desc":
      return " \u2193";
    case "none":
      return "";
  }
}

export function Table({ component, onEvent, module }: TableProps): React.JSX.Element {
  const columns = component.columns ?? [];
  const rows = component.rows ?? [];

  const [sort, setSort] = useState<SortState>({ columnKey: "", direction: "none" });
  const [filter, setFilter] = useState("");

  const handleSort = useCallback(
    (columnKey: string) => {
      setSort((prev) => {
        if (prev.columnKey !== columnKey) {
          return { columnKey, direction: "asc" };
        }
        const nextDirection: SortDirection =
          prev.direction === "asc" ? "desc" : prev.direction === "desc" ? "none" : "asc";
        return { columnKey, direction: nextDirection };
      });
    },
    [],
  );

  const filteredRows = useMemo(() => {
    if (!filter) return rows;
    const lowerFilter = filter.toLowerCase();
    return rows.filter((row) =>
      Object.values(row.values).some((val) => val.toLowerCase().includes(lowerFilter)),
    );
  }, [rows, filter]);

  const sortedRows = useMemo(() => {
    if (sort.direction === "none" || !sort.columnKey) return filteredRows;
    const key = sort.columnKey;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const aVal = a.values[key] ?? "";
      const bVal = b.values[key] ?? "";
      return aVal.localeCompare(bVal) * dir;
    });
  }, [filteredRows, sort]);

  const handleRowClick = useCallback(
    (rowIndex: number) => {
      onEvent?.({
        module,
        actionId: null,
        componentId: component.id,
        eventType: "click",
        data: { rowIndex: String(rowIndex) },
      });
    },
    [onEvent, module, component.id],
  );

  return (
    <div id={component.id}>
      <input
        type="text"
        placeholder="Filter rows..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={filterInputStyle}
        aria-label="Filter table rows"
      />
      <div style={wrapperStyle}>
        <table style={tableStyle} role="grid">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    ...(col.sortable ? thSortableStyle : thStyle),
                    width: col.width ? `${col.width}px` : undefined,
                  }}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  onKeyDown={
                    col.sortable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSort(col.key);
                          }
                        }
                      : undefined
                  }
                  tabIndex={col.sortable ? 0 : undefined}
                  role={col.sortable ? "columnheader" : undefined}
                  aria-sort={
                    sort.columnKey === col.key && sort.direction !== "none"
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {col.label}
                  {col.sortable && sort.columnKey === col.key
                    ? getSortIndicator(sort.direction)
                    : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => handleRowClick(rowIdx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRowClick(rowIdx);
                }}
                tabIndex={0}
                role="row"
                style={{ cursor: "pointer" }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={tdStyle}>
                    {row.values[col.key] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
            {sortedRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: token("textMuted"),
                    padding: spacing[6],
                  }}
                >
                  {filter ? "No matching rows" : "No data"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
