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

  const kbdStyle: React.CSSProperties = {
    padding: "1px 5px",
    borderRadius: "3px",
    border: "1px solid var(--mixa-border-default)",
    backgroundColor: "var(--mixa-bg-surface)",
    fontFamily: "'SF Mono', Menlo, monospace",
    fontSize: "12px",
  };

  const tipCardStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid var(--mixa-border-default)",
    backgroundColor: "var(--mixa-bg-base)",
    textAlign: "left",
    width: "100%",
  };

  const tipNumberStyle: React.CSSProperties = {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--mixa-accent), #818cf8)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 700,
    flexShrink: 0,
  };

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: "40px" }}>&#x1F4DA;</div>
      <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--mixa-text-primary)" }}>
        Your knowledge base is empty
      </div>
      <div style={{ fontSize: "13px", maxWidth: "440px", lineHeight: 1.5, marginBottom: "8px" }}>
        Get started by saving your first web page. Here&apos;s how:
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "440px", width: "100%" }}>
        <div style={tipCardStyle}>
          <div style={tipNumberStyle}>1</div>
          <div style={{ fontSize: "13px", color: "var(--mixa-text-primary)", lineHeight: 1.4 }}>
            Open a web tab with <kbd style={kbdStyle}>Cmd+T</kbd> and browse to any page
          </div>
        </div>
        <div style={tipCardStyle}>
          <div style={tipNumberStyle}>2</div>
          <div style={{ fontSize: "13px", color: "var(--mixa-text-primary)", lineHeight: 1.4 }}>
            Press <kbd style={kbdStyle}>Cmd+S</kbd> to save the full article, or select text and right-click
            to save a highlight
          </div>
        </div>
        <div style={tipCardStyle}>
          <div style={tipNumberStyle}>3</div>
          <div style={{ fontSize: "13px", color: "var(--mixa-text-primary)", lineHeight: 1.4 }}>
            Mixa auto-generates summaries, tags, and embeddings so you can search semantically later
          </div>
        </div>
      </div>
    </div>
  );
}
