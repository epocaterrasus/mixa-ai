// Settings tab — main settings panel with sidebar navigation

import { useEffect } from "react";
import { useSettingsStore, type SettingsSection } from "../../stores/settings";
import { AIProvidersSection } from "./AIProvidersSection";
import { AppearanceSection } from "./AppearanceSection";
import { EngineSection } from "./EngineSection";
import { ShortcutsSection } from "./ShortcutsSection";
import { DataSection } from "./DataSection";
import { GeneralSection } from "./GeneralSection";

const containerStyle: React.CSSProperties = {
  display: "flex",
  height: "100%",
  backgroundColor: "var(--mixa-bg-base)",
  color: "var(--mixa-text-primary)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const navStyle: React.CSSProperties = {
  width: "200px",
  flexShrink: 0,
  borderRight: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-surface)",
  padding: "16px 0",
  overflowY: "auto",
};

const navHeaderStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--mixa-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  padding: "8px 16px",
  marginBottom: "4px",
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "24px 32px",
  maxWidth: "720px",
};

const loadingStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  color: "var(--mixa-text-muted)",
  fontSize: "13px",
};

const errorBannerStyle: React.CSSProperties = {
  padding: "8px 16px",
  backgroundColor: "rgba(239, 68, 68, 0.15)",
  color: "#ef4444",
  fontSize: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
};

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { id: "ai-providers", label: "AI Providers", icon: "\u2728" },
  { id: "appearance", label: "Appearance", icon: "\u{1F3A8}" },
  { id: "general", label: "General", icon: "\u2699\uFE0F" },
  { id: "engine", label: "Engine", icon: "\u26A1" },
  { id: "shortcuts", label: "Shortcuts", icon: "\u2328\uFE0F" },
  { id: "data", label: "Data", icon: "\u{1F4BE}" },
];

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}): React.ReactElement {
  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "6px 16px",
    border: "none",
    background: isActive ? "var(--mixa-bg-active)" : "transparent",
    color: isActive ? "var(--mixa-text-primary)" : "var(--mixa-text-secondary)",
    fontSize: "13px",
    fontWeight: isActive ? 500 : 400,
    cursor: "pointer",
    textAlign: "left",
    borderRadius: "0",
    fontFamily: "inherit",
  };

  return (
    <button
      style={style}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isActive
          ? "var(--mixa-bg-active)"
          : "transparent";
      }}
    >
      <span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>
        {item.icon}
      </span>
      {item.label}
    </button>
  );
}

function SectionContent({
  section,
}: {
  section: SettingsSection;
}): React.ReactElement {
  switch (section) {
    case "ai-providers":
      return <AIProvidersSection />;
    case "appearance":
      return <AppearanceSection />;
    case "general":
      return <GeneralSection />;
    case "engine":
      return <EngineSection />;
    case "shortcuts":
      return <ShortcutsSection />;
    case "data":
      return <DataSection />;
  }
}

export function SettingsTab(): React.ReactElement {
  const {
    settings,
    isLoading,
    error,
    activeSection,
    loadSettings,
    setActiveSection,
    clearError,
  } = useSettingsStore();

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  if (isLoading && !settings) {
    return (
      <div style={loadingStyle}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <nav style={navStyle} aria-label="Settings sections">
        <div style={navHeaderStyle}>Settings</div>
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeSection === item.id}
            onClick={() => setActiveSection(item.id)}
          />
        ))}
      </nav>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {error && (
          <div style={errorBannerStyle}>
            <span>{error}</span>
            <button
              onClick={clearError}
              style={{
                background: "none",
                border: "none",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
              aria-label="Dismiss error"
            >
              x
            </button>
          </div>
        )}

        <div style={contentStyle}>
          {settings ? (
            <SectionContent section={activeSection} />
          ) : (
            <div style={{ color: "var(--mixa-text-muted)", fontSize: "13px" }}>
              Unable to load settings. Please try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
