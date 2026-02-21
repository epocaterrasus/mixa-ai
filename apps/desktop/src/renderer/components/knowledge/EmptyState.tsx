// Knowledge base empty state — shown when no items are captured yet

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  color: "var(--mixa-text-muted)",
  gap: "12px",
  padding: "48px 24px",
  textAlign: "center",
};

interface EmptyStateProps {
  hasSearch: boolean;
  hasFilters: boolean;
}

export function EmptyState({ hasSearch, hasFilters }: EmptyStateProps): React.ReactElement {
  if (hasSearch) {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: "40px" }}>&#x1F50D;</div>
        <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--mixa-text-primary)" }}>
          No results found
        </div>
        <div style={{ fontSize: "13px", maxWidth: "400px", lineHeight: 1.5 }}>
          Try adjusting your search query or clearing filters to find what you&apos;re looking for.
        </div>
      </div>
    );
  }

  if (hasFilters) {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: "40px" }}>&#x1F4CB;</div>
        <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--mixa-text-primary)" }}>
          No items match filters
        </div>
        <div style={{ fontSize: "13px", maxWidth: "400px", lineHeight: 1.5 }}>
          Try adjusting or clearing filters to see more items.
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: "40px" }}>&#x1F4DA;</div>
      <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--mixa-text-primary)" }}>
        Your knowledge base is empty
      </div>
      <div style={{ fontSize: "13px", maxWidth: "400px", lineHeight: 1.5 }}>
        Start building your knowledge base by browsing web pages and pressing{" "}
        <kbd
          style={{
            padding: "1px 5px",
            borderRadius: "3px",
            border: "1px solid var(--mixa-border-default)",
            backgroundColor: "var(--mixa-bg-surface)",
            fontFamily: "inherit",
            fontSize: "12px",
          }}
        >
          Cmd+S
        </kbd>{" "}
        to save articles, or by selecting text and choosing &quot;Save to Mixa&quot; from the
        context menu.
      </div>
    </div>
  );
}
