// Engine settings section — Fenix engine modules status and enable/disable

import { useEngineStore } from "../../stores/engine";

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

const statusRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "12px 16px",
  backgroundColor: "var(--mixa-bg-surface)",
  borderRadius: "8px",
  marginBottom: "16px",
  border: "1px solid var(--mixa-border-default)",
};

const moduleCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  border: "1px solid var(--mixa-border-default)",
  borderRadius: "8px",
  marginBottom: "8px",
  backgroundColor: "var(--mixa-bg-surface)",
};

const moduleInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  flex: 1,
  minWidth: 0,
};

const moduleNameStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
};

const moduleDescStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--mixa-text-muted)",
};

const statusDotStyle = (status: string): React.CSSProperties => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor:
    status === "running"
      ? "#4ade80"
      : status === "error"
        ? "#ef4444"
        : status === "starting"
          ? "#f59e0b"
          : "#666666",
  flexShrink: 0,
});

const statusTextStyle = (status: string): React.CSSProperties => ({
  fontSize: "11px",
  fontWeight: 500,
  color:
    status === "running"
      ? "#4ade80"
      : status === "error"
        ? "#ef4444"
        : status === "starting"
          ? "#f59e0b"
          : "var(--mixa-text-muted)",
});

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "32px",
  color: "var(--mixa-text-muted)",
  fontSize: "13px",
};

export function EngineSection(): React.ReactElement {
  const { connected, status, modules, version, uptime } = useEngineStore();

  const uptimeMinutes = Math.floor(uptime / 60);
  const uptimeDisplay =
    uptimeMinutes > 60
      ? `${Math.floor(uptimeMinutes / 60)}h ${uptimeMinutes % 60}m`
      : `${uptimeMinutes}m`;

  return (
    <div>
      <div style={sectionTitleStyle}>Fenix Engine</div>
      <div style={sectionDescStyle}>
        The Fenix engine runs as a local Go sidecar, providing infrastructure
        modules for secrets, git, shortcuts, and more.
      </div>

      {/* Engine Status */}
      <div style={statusRowStyle}>
        <div style={statusDotStyle(status)} />
        <span style={{ fontSize: "13px", fontWeight: 500 }}>
          {connected ? "Connected" : "Disconnected"}
        </span>
        {version && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--mixa-text-muted)",
              marginLeft: "auto",
            }}
          >
            v{version} &middot; Uptime: {uptimeDisplay}
          </span>
        )}
        {!connected && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--mixa-text-muted)",
              marginLeft: "auto",
            }}
          >
            Engine not running
          </span>
        )}
      </div>

      {/* Modules */}
      {modules.length === 0 ? (
        <div style={emptyStyle}>
          {connected
            ? "No modules registered"
            : "Start the Fenix engine to see available modules"}
        </div>
      ) : (
        modules.map((module) => (
          <div key={module.name} style={moduleCardStyle}>
            <div style={moduleInfoStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={moduleNameStyle}>{module.displayName}</span>
                <div style={statusDotStyle(module.status)} />
                <span style={statusTextStyle(module.status)}>
                  {module.status}
                </span>
              </div>
              <span style={moduleDescStyle}>{module.description}</span>
              {module.errorMessage && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#ef4444",
                    marginTop: "2px",
                  }}
                >
                  {module.errorMessage}
                </span>
              )}
            </div>
            <label
              style={{
                position: "relative",
                display: "inline-block",
                width: "36px",
                height: "20px",
                flexShrink: 0,
              }}
            >
              <input
                type="checkbox"
                checked={module.enabled}
                readOnly
                style={{ opacity: 0, width: 0, height: 0 }}
                aria-label={`Toggle ${module.displayName}`}
              />
              <span
                style={{
                  position: "absolute",
                  cursor: "default",
                  inset: 0,
                  backgroundColor: module.enabled
                    ? "var(--mixa-accent-primary)"
                    : "var(--mixa-bg-active)",
                  borderRadius: "10px",
                  opacity: 0.7,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    height: "14px",
                    width: "14px",
                    left: module.enabled ? "19px" : "3px",
                    bottom: "3px",
                    backgroundColor: "#fff",
                    borderRadius: "50%",
                  }}
                />
              </span>
            </label>
          </div>
        ))
      )}
    </div>
  );
}
