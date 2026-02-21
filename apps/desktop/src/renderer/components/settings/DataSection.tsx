// Data settings section — storage usage, export, clear cache

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  marginBottom: "4px",
};

const sectionDescStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--mixa-text-muted)",
  marginBottom: "24px",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--mixa-border-default)",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
  backgroundColor: "var(--mixa-bg-surface)",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "4px",
};

const cardDescStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--mixa-text-muted)",
  marginBottom: "12px",
};

const statRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "6px 0",
  borderBottom: "1px solid var(--mixa-border-subtle)",
  fontSize: "13px",
};

const buttonStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-elevated)",
  color: "var(--mixa-text-primary)",
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  color: "#ef4444",
  borderColor: "rgba(239, 68, 68, 0.3)",
};

export function DataSection(): React.ReactElement {
  return (
    <div>
      <div style={sectionTitleStyle}>Data Management</div>
      <div style={sectionDescStyle}>
        View storage usage and manage your local data. All data is stored
        locally on your machine.
      </div>

      {/* Storage Usage */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>Storage Usage</div>
        <div style={cardDescStyle}>
          Data stored in ~/.mixa/ directory
        </div>

        <div style={statRowStyle}>
          <span style={{ color: "var(--mixa-text-secondary)" }}>
            Knowledge Items
          </span>
          <span style={{ fontFamily: "'SF Mono', Menlo, monospace" }}>
            --
          </span>
        </div>
        <div style={statRowStyle}>
          <span style={{ color: "var(--mixa-text-secondary)" }}>
            Embeddings
          </span>
          <span style={{ fontFamily: "'SF Mono', Menlo, monospace" }}>
            --
          </span>
        </div>
        <div style={statRowStyle}>
          <span style={{ color: "var(--mixa-text-secondary)" }}>
            Chat History
          </span>
          <span style={{ fontFamily: "'SF Mono', Menlo, monospace" }}>
            --
          </span>
        </div>
        <div style={{ ...statRowStyle, borderBottom: "none" }}>
          <span style={{ color: "var(--mixa-text-secondary)" }}>
            Total Size
          </span>
          <span
            style={{
              fontFamily: "'SF Mono', Menlo, monospace",
              fontWeight: 600,
            }}
          >
            --
          </span>
        </div>
      </div>

      {/* Export */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>Export Data</div>
        <div style={cardDescStyle}>
          Export all your knowledge items, chat history, and settings as a JSON
          file.
        </div>
        <button
          style={buttonStyle}
          onClick={() => {
            // Export functionality will be implemented with PGlite (MIXA-046)
          }}
        >
          Export All Data
        </button>
      </div>

      {/* Clear Cache */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>Clear Cache</div>
        <div style={cardDescStyle}>
          Clear cached web content and temporary files. This does not affect
          your saved knowledge items or settings.
        </div>
        <button
          style={dangerButtonStyle}
          onClick={() => {
            // Clear cache functionality
          }}
        >
          Clear Cache
        </button>
      </div>

      {/* Reset */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>Reset All Settings</div>
        <div style={cardDescStyle}>
          Reset all settings to their default values. This does not delete your
          data.
        </div>
        <button
          style={dangerButtonStyle}
          onClick={() => {
            // Reset functionality
          }}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
