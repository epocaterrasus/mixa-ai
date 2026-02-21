// General settings section — auto-capture, browsing, search engine

import { useSettingsStore } from "../../stores/settings";
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

const groupStyle: React.CSSProperties = {
  marginBottom: "24px",
};

const groupTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  marginBottom: "8px",
};

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  border: "1px solid var(--mixa-border-default)",
  borderRadius: "8px",
  backgroundColor: "var(--mixa-bg-surface)",
  marginBottom: "8px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--mixa-text-secondary)",
  marginBottom: "4px",
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  border: "1px solid var(--mixa-border-default)",
  borderRadius: "6px",
  backgroundColor: "var(--mixa-bg-elevated)",
  color: "var(--mixa-text-primary)",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}): React.ReactElement {
  return (
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
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0 }}
        aria-label={label}
      />
      <span
        style={{
          position: "absolute",
          cursor: "pointer",
          inset: 0,
          backgroundColor: checked
            ? "var(--mixa-accent-primary)"
            : "var(--mixa-bg-active)",
          borderRadius: "10px",
          transition: "background-color 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            height: "14px",
            width: "14px",
            left: checked ? "19px" : "3px",
            bottom: "3px",
            backgroundColor: "#fff",
            borderRadius: "50%",
            transition: "left 0.2s",
          }}
        />
      </span>
    </label>
  );
}

function UpdateSection(): React.ReactElement {
  const {
    status,
    version,
    currentVersion,
    error,
    downloadProgress,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  } = useUpdaterStore();

  const statusLabel = (): string => {
    switch (status) {
      case "idle":
      case "not-available":
        return "Up to date";
      case "checking":
        return "Checking for updates...";
      case "available":
        return `Version ${version ?? "?"} available`;
      case "downloading":
        return `Downloading ${Math.round(downloadProgress ?? 0)}%`;
      case "ready":
        return `Version ${version ?? "?"} ready to install`;
      case "error":
        return `Update error: ${error ?? "unknown"}`;
    }
  };

  const actionBtnStyle: React.CSSProperties = {
    padding: "4px 12px",
    borderRadius: 6,
    border: "1px solid var(--mixa-border-default)",
    backgroundColor: "var(--mixa-bg-elevated)",
    color: "var(--mixa-text-primary)",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <div style={groupStyle}>
      <div style={groupTitleStyle}>About</div>
      <div style={toggleRowStyle}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 500 }}>
            Mixa v{currentVersion || "0.1.0"}
          </div>
          <div style={{ fontSize: "12px", color: "var(--mixa-text-muted)", marginTop: 2 }}>
            {statusLabel()}
          </div>
          {status === "downloading" && (
            <div
              style={{
                width: "100%",
                maxWidth: 200,
                height: 3,
                borderRadius: 2,
                backgroundColor: "var(--mixa-bg-active)",
                marginTop: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${downloadProgress ?? 0}%`,
                  height: "100%",
                  backgroundColor: "var(--mixa-accent-primary)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(status === "idle" || status === "not-available" || status === "error") && (
            <button
              type="button"
              style={actionBtnStyle}
              onClick={() => void checkForUpdates()}
            >
              Check for Updates
            </button>
          )}
          {status === "available" && (
            <button
              type="button"
              style={actionBtnStyle}
              onClick={() => void downloadUpdate()}
            >
              Download
            </button>
          )}
          {status === "ready" && (
            <button
              type="button"
              style={actionBtnStyle}
              onClick={() => void installUpdate()}
            >
              Restart to Update
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GeneralSection(): React.ReactElement {
  const {
    settings,
    updateAutoCapture,
    updateAutoCaptureMinSeconds,
    updateAugmentedBrowsing,
    updateDefaultSearchEngine,
  } = useSettingsStore();

  if (!settings) return <div />;

  return (
    <div>
      <div style={sectionTitleStyle}>General</div>
      <div style={sectionDescStyle}>
        Configure browsing behavior, content capture, and search preferences.
      </div>

      <UpdateSection />

      {/* Auto Capture */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Content Capture</div>

        <div style={toggleRowStyle}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 500 }}>
              Auto-Capture Pages
            </div>
            <div style={{ fontSize: "12px", color: "var(--mixa-text-muted)" }}>
              Automatically save pages you visit for longer than the minimum
              time
            </div>
          </div>
          <ToggleSwitch
            checked={settings.autoCaptureEnabled}
            onChange={(v) => void updateAutoCapture(v)}
            label="Toggle auto-capture"
          />
        </div>

        {settings.autoCaptureEnabled && (
          <div style={{ padding: "0 16px", marginBottom: "8px" }}>
            <label style={labelStyle}>
              Minimum time on page (seconds)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={settings.autoCaptureMinSeconds}
                onChange={(e) =>
                  void updateAutoCaptureMinSeconds(
                    parseInt(e.target.value, 10),
                  )
                }
                style={{ flex: 1, maxWidth: "200px" }}
                aria-label="Auto-capture minimum seconds"
              />
              <span
                style={{
                  fontSize: "13px",
                  fontFamily: "'SF Mono', Menlo, monospace",
                  color: "var(--mixa-text-secondary)",
                  minWidth: "40px",
                }}
              >
                {settings.autoCaptureMinSeconds}s
              </span>
            </div>
          </div>
        )}

        <div style={toggleRowStyle}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 500 }}>
              Augmented Browsing
            </div>
            <div style={{ fontSize: "12px", color: "var(--mixa-text-muted)" }}>
              Show knowledge indicators on web pages you&apos;ve saved
            </div>
          </div>
          <ToggleSwitch
            checked={settings.augmentedBrowsingEnabled}
            onChange={(v) => void updateAugmentedBrowsing(v)}
            label="Toggle augmented browsing"
          />
        </div>
      </div>

      {/* Search Engine */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Default Search Engine</div>
        <label style={labelStyle}>Search URL template</label>
        <input
          type="text"
          value={settings.defaultSearchEngine}
          onChange={(e) => void updateDefaultSearchEngine(e.target.value)}
          style={inputStyle}
          placeholder="https://www.google.com/search?q="
        />
        <span
          style={{
            fontSize: "11px",
            color: "var(--mixa-text-muted)",
            marginTop: "4px",
            display: "block",
          }}
        >
          Used when you type a search query in the omnibar. Your query will be
          appended to this URL.
        </span>
      </div>
    </div>
  );
}
