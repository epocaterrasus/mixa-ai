// Appearance settings section — theme, accent color, font size, layout

import { useState, useCallback } from "react";
import type { ThemeMode, SidebarPosition, TabBarPosition } from "@mixa-ai/types";
import { accentPresets, isValidHexColor } from "@mixa-ai/ui";
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

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--mixa-text-secondary)",
  marginBottom: "4px",
  display: "block",
};

const toggleGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: "0",
  borderRadius: "6px",
  overflow: "hidden",
  border: "1px solid var(--mixa-border-default)",
  width: "fit-content",
};

function ToggleOption<T extends string>({
  value,
  currentValue,
  label,
  onSelect,
}: {
  value: T;
  currentValue: T;
  label: string;
  onSelect: (v: T) => void;
}): React.ReactElement {
  const isActive = value === currentValue;
  return (
    <button
      onClick={() => onSelect(value)}
      aria-pressed={isActive}
      style={{
        padding: "6px 16px",
        border: "none",
        borderRight: "1px solid var(--mixa-border-default)",
        backgroundColor: isActive
          ? "var(--mixa-accent-primary)"
          : "var(--mixa-bg-elevated)",
        color: isActive ? "#fff" : "var(--mixa-text-secondary)",
        fontSize: "12px",
        fontWeight: isActive ? 500 : 400,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function AccentColorPicker({
  currentColor,
  onSelect,
}: {
  currentColor: string;
  onSelect: (hex: string) => void;
}): React.ReactElement {
  const [customHex, setCustomHex] = useState("");

  const handleCustomSubmit = useCallback(() => {
    const hex = customHex.startsWith("#") ? customHex : `#${customHex}`;
    if (isValidHexColor(hex)) {
      onSelect(hex);
      setCustomHex("");
    }
  }, [customHex, onSelect]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "8px",
        }}
      >
        {accentPresets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onSelect(preset.value)}
            title={preset.name}
            aria-label={`${preset.name} accent color`}
            aria-pressed={currentColor === preset.value}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              border:
                currentColor === preset.value
                  ? "2px solid var(--mixa-text-primary)"
                  : "2px solid transparent",
              backgroundColor: preset.value,
              cursor: "pointer",
              padding: 0,
              outline:
                currentColor === preset.value
                  ? "2px solid var(--mixa-bg-base)"
                  : "none",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="text"
          value={customHex}
          onChange={(e) => setCustomHex(e.target.value)}
          placeholder="#6366f1"
          maxLength={7}
          style={{
            width: "100px",
            padding: "4px 8px",
            border: "1px solid var(--mixa-border-default)",
            borderRadius: "6px",
            backgroundColor: "var(--mixa-bg-elevated)",
            color: "var(--mixa-text-primary)",
            fontSize: "12px",
            fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace",
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCustomSubmit();
          }}
        />
        <span style={{ fontSize: "11px", color: "var(--mixa-text-muted)" }}>
          Custom hex
        </span>
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "4px",
            backgroundColor: currentColor,
            border: "1px solid var(--mixa-border-default)",
            flexShrink: 0,
          }}
          title={`Current: ${currentColor}`}
        />
      </div>
    </div>
  );
}

export function AppearanceSection(): React.ReactElement {
  const {
    settings,
    updateThemeMode,
    updateAccentColor,
    updateFontSize,
    updateSidebarPosition,
    updateTabBarPosition,
    updateCompactMode,
  } = useSettingsStore();

  if (!settings) return <div />;

  const { theme } = settings;

  return (
    <div>
      <div style={sectionTitleStyle}>Appearance</div>
      <div style={sectionDescStyle}>
        Customize the look and feel of your Mixa browser.
      </div>

      {/* Theme Mode */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Theme</div>
        <div style={toggleGroupStyle}>
          <ToggleOption<ThemeMode>
            value="dark"
            currentValue={theme.mode}
            label="Dark"
            onSelect={(v) => void updateThemeMode(v)}
          />
          <ToggleOption<ThemeMode>
            value="light"
            currentValue={theme.mode}
            label="Light"
            onSelect={(v) => void updateThemeMode(v)}
          />
          <ToggleOption<ThemeMode>
            value="system"
            currentValue={theme.mode}
            label="System"
            onSelect={(v) => void updateThemeMode(v)}
          />
        </div>
      </div>

      {/* Accent Color */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Accent Color</div>
        <AccentColorPicker
          currentColor={theme.accentColor}
          onSelect={(hex) => void updateAccentColor(hex)}
        />
      </div>

      {/* Font Size */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Font Size</div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            type="range"
            min={10}
            max={20}
            value={theme.fontSize}
            onChange={(e) => void updateFontSize(parseInt(e.target.value, 10))}
            style={{ flex: 1, maxWidth: "200px" }}
            aria-label="Font size"
          />
          <span
            style={{
              fontSize: "13px",
              fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace",
              color: "var(--mixa-text-secondary)",
              minWidth: "32px",
            }}
          >
            {theme.fontSize}px
          </span>
        </div>
      </div>

      {/* Sidebar Position */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Sidebar Position</div>
        <div style={toggleGroupStyle}>
          <ToggleOption<SidebarPosition>
            value="left"
            currentValue={theme.sidebarPosition}
            label="Left"
            onSelect={(v) => void updateSidebarPosition(v)}
          />
          <ToggleOption<SidebarPosition>
            value="right"
            currentValue={theme.sidebarPosition}
            label="Right"
            onSelect={(v) => void updateSidebarPosition(v)}
          />
        </div>
      </div>

      {/* Tab Bar Position */}
      <div style={groupStyle}>
        <div style={groupTitleStyle}>Tab Bar Position</div>
        <div style={toggleGroupStyle}>
          <ToggleOption<TabBarPosition>
            value="top"
            currentValue={theme.tabBarPosition}
            label="Top"
            onSelect={(v) => void updateTabBarPosition(v)}
          />
          <ToggleOption<TabBarPosition>
            value="bottom"
            currentValue={theme.tabBarPosition}
            label="Bottom"
            onSelect={(v) => void updateTabBarPosition(v)}
          />
        </div>
      </div>

      {/* Compact Mode */}
      <div style={groupStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={groupTitleStyle}>Compact Mode</div>
            <div style={{ fontSize: "12px", color: "var(--mixa-text-muted)" }}>
              Reduce padding and spacing for a denser UI
            </div>
          </div>
          <label
            style={{ position: "relative", display: "inline-block", width: "36px", height: "20px" }}
          >
            <input
              type="checkbox"
              checked={theme.compactMode}
              onChange={(e) => void updateCompactMode(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
              aria-label="Toggle compact mode"
            />
            <span
              style={{
                position: "absolute",
                cursor: "pointer",
                inset: 0,
                backgroundColor: theme.compactMode
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
                  left: theme.compactMode ? "19px" : "3px",
                  bottom: "3px",
                  backgroundColor: "#fff",
                  borderRadius: "50%",
                  transition: "left 0.2s",
                }}
              />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
