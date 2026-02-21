// About section — app version info, update status, and manual download link

import { useUpdaterStore } from "../../stores/updater";

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

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  border: "1px solid var(--mixa-border-default)",
  borderRadius: "8px",
  marginBottom: "8px",
  backgroundColor: "var(--mixa-bg-surface)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
};

const valueStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--mixa-text-muted)",
};

const btnStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-elevated)",
  color: "var(--mixa-text-primary)",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};

const linkStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--mixa-accent-primary, #6366f1)",
  textDecoration: "none",
};

const statusLabels: Record<string, string> = {
  idle: "Up to date",
  checking: "Checking...",
  available: "Update available",
  "not-available": "Up to date",
  downloading: "Downloading...",
  ready: "Restart to update",
  error: "Update check failed",
};

export function AboutSection(): React.ReactElement {
  const {
    status,
    version,
    currentVersion,
    downloadProgress,
    error,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  } = useUpdaterStore();

  const statusLabel = statusLabels[status] ?? status;
  const isChecking = status === "checking";

  return (
    <div>
      <div style={sectionTitleStyle}>About Mixa</div>
      <div style={sectionDescStyle}>
        Version information and software updates.
      </div>

      {/* Current version */}
      <div style={rowStyle}>
        <span style={labelStyle}>App Version</span>
        <span style={valueStyle}>
          {currentVersion || "0.1.0"}
        </span>
      </div>

      {/* Electron / Chrome / Node versions */}
      <div style={rowStyle}>
        <span style={labelStyle}>Electron</span>
        <span style={valueStyle}>
          {window.electronAPI.versions.electron}
        </span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Chromium</span>
        <span style={valueStyle}>
          {window.electronAPI.versions.chrome}
        </span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Node.js</span>
        <span style={valueStyle}>
          {window.electronAPI.versions.node}
        </span>
      </div>

      {/* Update status */}
      <div style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch", gap: "8px", marginTop: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={labelStyle}>Updates</span>
          <span style={valueStyle}>{statusLabel}</span>
        </div>

        {status === "downloading" && downloadProgress != null && (
          <div style={{ width: "100%", height: "4px", borderRadius: "2px", backgroundColor: "var(--mixa-bg-active)", overflow: "hidden" }}>
            <div style={{
              width: `${downloadProgress}%`,
              height: "100%",
              borderRadius: "2px",
              backgroundColor: "var(--mixa-accent-primary, #6366f1)",
              transition: "width 0.3s ease",
            }} />
          </div>
        )}

        {status === "available" && version && (
          <div style={{ fontSize: "12px", color: "var(--mixa-text-muted)" }}>
            Version {version} is available.
          </div>
        )}

        {status === "error" && error && (
          <div style={{ fontSize: "12px", color: "#ef4444" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          {(status === "idle" || status === "not-available" || status === "error") && (
            <button
              type="button"
              style={btnStyle}
              onClick={() => void checkForUpdates()}
              disabled={isChecking}
            >
              Check for Updates
            </button>
          )}
          {status === "available" && (
            <button
              type="button"
              style={btnStyle}
              onClick={() => void downloadUpdate()}
            >
              Download Update
            </button>
          )}
          {status === "ready" && (
            <button
              type="button"
              style={btnStyle}
              onClick={() => void installUpdate()}
            >
              Restart &amp; Update
            </button>
          )}
        </div>
      </div>

      {/* Manual download fallback */}
      <div style={{ marginTop: "16px", textAlign: "center" }}>
        <a
          href="https://github.com/mixa-ai/mixa-ai/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
        >
          Download latest release manually
        </a>
      </div>
    </div>
  );
}
