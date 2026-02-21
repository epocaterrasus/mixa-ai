// Knowledge tab — browse and search saved items

import { useEffect, useCallback } from "react";
import { useKnowledgeStore } from "../../stores/knowledge";
import { KnowledgeToolbar } from "./KnowledgeToolbar";
import { FilterPanel } from "./FilterPanel";
import { ItemCard } from "./ItemCard";
import { ItemRow } from "./ItemRow";
import { ItemDetail } from "./ItemDetail";
import { Pagination } from "./Pagination";
import { EmptyState } from "./EmptyState";

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: "var(--mixa-bg-base)",
  color: "var(--mixa-text-primary)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const bodyStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  overflow: "hidden",
};

const mainStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
};

const gridContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: "12px",
};

const listContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
};

const listHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "6px 16px",
  borderBottom: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-surface)",
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--mixa-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  flexShrink: 0,
};

const loadingStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  color: "var(--mixa-text-muted)",
  fontSize: "13px",
  gap: "8px",
};

const errorBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 16px",
  backgroundColor: "rgba(239, 68, 68, 0.1)",
  borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
  color: "#ef4444",
  fontSize: "13px",
  flexShrink: 0,
};

const dismissButtonStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: "4px",
  border: "1px solid #ef4444",
  backgroundColor: "transparent",
  color: "#ef4444",
  fontSize: "12px",
  cursor: "pointer",
};

export function KnowledgeTab(): React.ReactElement {
  const {
    items,
    total,
    selectedItemId,
    selectedItem,
    viewMode,
    searchQuery,
    isLoading,
    error,
    checkedIds,
    showFilters,
    filters,
    sortBy,
    sortOrder,
    page,
    pageSize,
    loadItems,
    search,
    setViewMode,
    setFilter,
    clearFilters,
    setSortBy,
    setSortOrder,
    setPage,
    selectItem,
    toggleCheckItem,
    checkAllItems,
    clearChecked,
    deleteItems,
    toggleFavorite,
    toggleArchive,
    toggleFilters,
    clearError,
  } = useKnowledgeStore();

  // Load items on mount
  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleSelect = useCallback(
    (id: string) => {
      selectItem(selectedItemId === id ? null : id);
    },
    [selectItem, selectedItemId],
  );

  const handleCloseDetail = useCallback(() => {
    selectItem(null);
  }, [selectItem]);

  const handleDeleteChecked = useCallback(() => {
    const ids = Array.from(checkedIds);
    if (ids.length > 0) {
      void deleteItems(ids);
    }
  }, [checkedIds, deleteItems]);

  const handleDeleteFromDetail = useCallback(
    (ids: string[]) => {
      void deleteItems(ids);
    },
    [deleteItems],
  );

  const handleToggleFavorite = useCallback(
    (id: string) => {
      void toggleFavorite(id);
    },
    [toggleFavorite],
  );

  const handleToggleArchive = useCallback(
    (id: string) => {
      void toggleArchive(id);
    },
    [toggleArchive],
  );

  const hasActiveFilters =
    filters.itemType !== undefined ||
    filters.isFavorite !== undefined ||
    filters.isArchived !== false ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined;

  return (
    <div style={containerStyle}>
      {/* Toolbar */}
      <KnowledgeToolbar
        searchQuery={searchQuery}
        viewMode={viewMode}
        sortBy={sortBy}
        sortOrder={sortOrder}
        showFilters={showFilters}
        totalItems={total}
        checkedCount={checkedIds.size}
        onSearch={search}
        onSetViewMode={setViewMode}
        onSetSortBy={setSortBy}
        onSetSortOrder={setSortOrder}
        onToggleFilters={toggleFilters}
        onCheckAll={checkAllItems}
        onClearChecked={clearChecked}
        onDeleteChecked={handleDeleteChecked}
      />

      {/* Error bar */}
      {error && (
        <div style={errorBarStyle}>
          <span>{error}</span>
          <button type="button" style={dismissButtonStyle} onClick={clearError}>
            Dismiss
          </button>
        </div>
      )}

      {/* Body: filters + content + detail */}
      <div style={bodyStyle}>
        {/* Filter panel */}
        {showFilters && (
          <FilterPanel
            filters={filters}
            onSetFilter={setFilter}
            onClearFilters={clearFilters}
          />
        )}

        {/* Main content area */}
        <div style={mainStyle}>
          {isLoading ? (
            <div style={loadingStyle}>
              <span
                style={{
                  display: "inline-block",
                  width: "16px",
                  height: "16px",
                  border: "2px solid var(--mixa-border-default)",
                  borderTopColor: "var(--mixa-accent-primary)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Loading...
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              hasSearch={searchQuery.trim().length > 0}
              hasFilters={hasActiveFilters}
            />
          ) : viewMode === "grid" ? (
            <div style={gridContainerStyle}>
              <div style={gridStyle}>
                {items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isChecked={checkedIds.has(item.id)}
                    isSelected={selectedItemId === item.id}
                    onSelect={handleSelect}
                    onCheck={toggleCheckItem}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div style={listContainerStyle}>
              {/* List header */}
              <div style={listHeaderStyle}>
                <div style={{ width: "16px" }} />
                <div style={{ width: "16px" }} />
                <div style={{ flex: 1 }}>Title</div>
                <div style={{ width: "140px" }}>Domain</div>
                <div style={{ width: "80px", textAlign: "center" }}>Type</div>
                <div style={{ width: "80px", textAlign: "right" }}>Date</div>
                <div style={{ width: "24px" }} />
              </div>
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isChecked={checkedIds.has(item.id)}
                  isSelected={selectedItemId === item.id}
                  onSelect={handleSelect}
                  onCheck={toggleCheckItem}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onSetPage={setPage}
          />
        </div>

        {/* Detail panel */}
        {selectedItem && (
          <ItemDetail
            item={selectedItem}
            onClose={handleCloseDetail}
            onToggleFavorite={handleToggleFavorite}
            onToggleArchive={handleToggleArchive}
            onDelete={handleDeleteFromDetail}
          />
        )}
      </div>
    </div>
  );
}
