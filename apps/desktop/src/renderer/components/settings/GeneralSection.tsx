// General settings section — auto-capture, browsing, search engine, media bar

import type { MediaBarPosition } from "@mixa-ai/types";
import { useSettingsStore } from "../../stores/settings";

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

const segmentedControlStyle: React.CSSProperties = {
  display: "flex",
  borderRadius: "6px",
  overflow: "hidden",
  border: "1px solid var(--mixa-border-default)",
  flexShrink: 0,
};

function SegmentedControl({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (val: string) => void;
  label: string;
}): React.ReactElement {
  return (
    <div style={segmentedControlStyle} role="radiogroup" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "4px 12px",
            border: "none",
            backgroundColor: value === opt.value
              ? "var(--mixa-accent-primary)"
              : "var(--mixa-bg-elevated)",
            color: value === opt.value ? "#fff" : "var(--mixa-text-secondary)",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: value === opt.value ? 500 : 400,
          }}
        >
          {opt.label}
        </button>
      ))}
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
    updateMediaBarEnabled,
    updateMediaBarPosition,
  } = useSettingsStore();

  if (!settings) return <div />;

  return (
    <div>
      <div style={sectionTitleStyle}>General</div>
      <div style={sectionDescStyle}>
        Configure browsing behavior, content capture, and search preferences.
      </div>

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

      {/* Media Bar */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Media Bar</div>

        <div style={toggleRowStyle}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 500 }}>
              Enable Media Bar
            </div>
            <div style={{ fontSize: "12px", color: "var(--mixa-text-muted)" }}>
              Show Google Meet controls and audio indicators
            </div>
          </div>
          <ToggleSwitch
            checked={settings.mediaBar.enabled}
            onChange={(v) => void updateMediaBarEnabled(v)}
            label="Toggle media bar"
          />
        </div>

        {settings.mediaBar.enabled && (
          <div style={toggleRowStyle}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500 }}>
                Position
              </div>
              <div style={{ fontSize: "12px", color: "var(--mixa-text-muted)" }}>
                Where the media bar appears in the window
              </div>
            </div>
            <SegmentedControl
              value={settings.mediaBar.position}
              options={[
                { value: "top", label: "Top" },
                { value: "bottom", label: "Bottom" },
              ]}
              onChange={(v) => void updateMediaBarPosition(v as MediaBarPosition)}
              label="Media bar position"
            />
          </div>
        )}
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
