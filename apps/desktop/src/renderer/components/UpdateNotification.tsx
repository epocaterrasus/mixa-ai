// Update notification toast — shows when an update is available or downloaded

import { useUpdaterStore } from "../stores/updater";

const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 16,
  left: 16,
  zIndex: 10000,
  maxWidth: 340,
  animation: "toastSlideIn 0.2s ease-out",
};

const cardStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 8,
  fontSize: 13,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  backgroundColor: "var(--mixa-bg-elevated, #1a1a2e)",
  border: "1px solid var(--mixa-accent, #4f46e5)",
  color: "var(--mixa-text-primary, #e2e8f0)",
};

const titleStyle: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: 4,
  fontSize: 13,
};

const descStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--mixa-text-muted, #94a3b8)",
  marginBottom: 8,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 6,
  border: "none",
  backgroundColor: "var(--mixa-accent-primary, #4f46e5)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 6,
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};

const progressBarContainerStyle: React.CSSProperties = {
  width: "100%",
  height: 4,
  borderRadius: 2,
  backgroundColor: "var(--mixa-bg-active, #2a2a3e)",
  marginBottom: 8,
  overflow: "hidden",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UpdateNotification(): React.ReactElement | null {
  const {
    status,
    version,
    error,
    downloadProgress,
    bytesPerSecond,
    transferred,
    total,
    dismissed,
    dismiss,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  } = useUpdaterStore();

  // Only show for actionable states
  if (dismissed) return null;
  if (
    status !== "available" &&
    status !== "downloading" &&
    status !== "ready" &&
    status !== "error"
  ) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle} role="alert">
        {status === "available" && (
          <>
            <div style={titleStyle}>Update Available</div>
            <div style={descStyle}>
              Version {version} is ready to download.
            </div>
            <div style={buttonRowStyle}>
              <button
                type="button"
                style={secondaryBtnStyle}
                onClick={dismiss}
              >
                Later
              </button>
              <button
                type="button"
                style={primaryBtnStyle}
                onClick={() => void downloadUpdate()}
              >
                Download
              </button>
            </div>
          </>
        )}

        {status === "downloading" && (
          <>
            <div style={titleStyle}>Downloading Update</div>
            <div style={progressBarContainerStyle}>
              <div
                style={{
                  width: `${downloadProgress ?? 0}%`,
                  height: "100%",
                  borderRadius: 2,
                  backgroundColor: "var(--mixa-accent-primary, #4f46e5)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={descStyle}>
              {Math.round(downloadProgress ?? 0)}%
              {transferred != null && total != null && (
                <> &middot; {formatBytes(transferred)} / {formatBytes(total)}</>
              )}
              {bytesPerSecond != null && bytesPerSecond > 0 && (
                <> &middot; {formatBytes(bytesPerSecond)}/s</>
              )}
            </div>
          </>
        )}

        {status === "ready" && (
          <>
            <div style={titleStyle}>Update Ready</div>
            <div style={descStyle}>
              Version {version} has been downloaded. Restart to apply.
            </div>
            <div style={buttonRowStyle}>
              <button
                type="button"
                style={secondaryBtnStyle}
                onClick={dismiss}
              >
                Later
              </button>
              <button
                type="button"
                style={primaryBtnStyle}
                onClick={() => void installUpdate()}
              >
                Restart Now
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div style={titleStyle}>Update Failed</div>
            <div style={descStyle}>
              {error ?? "Auto-update encountered an error."}
            </div>
            <div style={buttonRowStyle}>
              <button
                type="button"
                style={secondaryBtnStyle}
                onClick={dismiss}
              >
                Dismiss
              </button>
              <a
                href="https://github.com/mixa-ai/mixa-ai/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...primaryBtnStyle, textDecoration: "none" }}
              >
                Download Manually
              </a>
              <button
                type="button"
                style={secondaryBtnStyle}
                onClick={() => void checkForUpdates()}
              >
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
