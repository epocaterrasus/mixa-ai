// Shortcuts settings section — view and rebind keyboard shortcuts

import { useState, useEffect, useCallback } from "react";

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

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--mixa-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  padding: "8px 12px",
  borderBottom: "1px solid var(--mixa-border-subtle)",
};

const tdStyle: React.CSSProperties = {
  fontSize: "13px",
  padding: "8px 12px",
  borderBottom: "1px solid var(--mixa-border-subtle)",
  verticalAlign: "middle",
};

const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "4px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "var(--mixa-bg-elevated)",
  fontSize: "12px",
  fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace",
  lineHeight: "1.4",
};

const recordingStyle: React.CSSProperties = {
  ...kbdStyle,
  borderColor: "var(--mixa-accent-primary)",
  backgroundColor: "rgba(99, 102, 241, 0.15)",
  color: "var(--mixa-accent-primary)",
  animation: "pulse 1.5s infinite",
};

const isMac =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
const cmdKey = isMac ? "\u2318" : "Ctrl";
const shiftKey = isMac ? "\u21E7" : "Shift";

interface ShortcutDef {
  id: string;
  label: string;
  keys: string;
  category: string;
}

const defaultShortcuts: ShortcutDef[] = [
  // Tabs
  { id: "new-tab", label: "New Tab", keys: `${cmdKey}+T`, category: "Tabs" },
  { id: "close-tab", label: "Close Tab", keys: `${cmdKey}+W`, category: "Tabs" },
  { id: "switch-tab-1", label: "Switch to Tab 1", keys: `${cmdKey}+1`, category: "Tabs" },
  { id: "switch-tab-9", label: "Switch to Last Tab", keys: `${cmdKey}+9`, category: "Tabs" },

  // Navigation
  { id: "focus-omnibar", label: "Focus Omnibar", keys: `${cmdKey}+L`, category: "Navigation" },
  { id: "command-palette", label: "Command Palette", keys: `${cmdKey}+K`, category: "Navigation" },
  { id: "go-back", label: "Go Back", keys: `${cmdKey}+[`, category: "Navigation" },
  { id: "go-forward", label: "Go Forward", keys: `${cmdKey}+]`, category: "Navigation" },
  { id: "reload", label: "Reload Page", keys: `${cmdKey}+R`, category: "Navigation" },

  // Sidebar
  { id: "toggle-sidebar", label: "Toggle Sidebar", keys: `${cmdKey}+B`, category: "Sidebar" },

  // Find
  { id: "find-in-page", label: "Find in Page", keys: `${cmdKey}+F`, category: "Find" },

  // Special Tabs
  { id: "new-terminal", label: "New Terminal", keys: `${cmdKey}+${shiftKey}+T`, category: "Special" },
  { id: "open-settings", label: "Open Settings", keys: `${cmdKey}+,`, category: "Special" },
];

function ShortcutRow({
  shortcut,
  isRecording,
  onStartRecording,
}: {
  shortcut: ShortcutDef;
  isRecording: boolean;
  onStartRecording: () => void;
}): React.ReactElement {
  return (
    <tr>
      <td style={tdStyle}>{shortcut.label}</td>
      <td style={tdStyle}>
        <span style={{ fontSize: "11px", color: "var(--mixa-text-muted)" }}>
          {shortcut.category}
        </span>
      </td>
      <td style={{ ...tdStyle, textAlign: "right" }}>
        <button
          onClick={onStartRecording}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            fontFamily: "inherit",
          }}
          aria-label={`Rebind ${shortcut.label}`}
        >
          <kbd style={isRecording ? recordingStyle : kbdStyle}>
            {isRecording ? "Press keys..." : shortcut.keys}
          </kbd>
        </button>
      </td>
    </tr>
  );
}

export function ShortcutsSection(): React.ReactElement {
  const [shortcuts] = useState<ShortcutDef[]>(defaultShortcuts);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!recordingId) return;

      e.preventDefault();
      e.stopPropagation();

      // Ignore modifier-only presses
      if (["Meta", "Control", "Alt", "Shift"].includes(e.key)) return;

      // Build key string
      const parts: string[] = [];
      if (e.metaKey || e.ctrlKey) parts.push(cmdKey);
      if (e.shiftKey) parts.push(shiftKey);
      if (e.altKey) parts.push("Alt");
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);

      // For now, just stop recording (shortcut rebinding will be persisted in a future iteration)
      void parts; // recorded key combo - persistence TBD
      setRecordingId(null);
    },
    [recordingId],
  );

  useEffect(() => {
    if (recordingId) {
      window.addEventListener("keydown", handleKeyDown, true);
      return () => window.removeEventListener("keydown", handleKeyDown, true);
    }
    return undefined;
  }, [recordingId, handleKeyDown]);

  // Group shortcuts by category
  const categories = [...new Set(shortcuts.map((s) => s.category))];

  return (
    <div>
      <div style={sectionTitleStyle}>Keyboard Shortcuts</div>
      <div style={sectionDescStyle}>
        View all keyboard shortcuts. Click any shortcut to rebind it.
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Action</th>
            <th style={thStyle}>Category</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Shortcut</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) =>
            shortcuts
              .filter((s) => s.category === category)
              .map((shortcut) => (
                <ShortcutRow
                  key={shortcut.id}
                  shortcut={shortcut}
                  isRecording={recordingId === shortcut.id}
                  onStartRecording={() =>
                    setRecordingId(
                      recordingId === shortcut.id ? null : shortcut.id,
                    )
                  }
                />
              )),
          )}
        </tbody>
      </table>

      <div style={{ marginTop: "16px" }}>
        <button
          onClick={() => setRecordingId(null)}
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            border: "1px solid var(--mixa-border-subtle)",
            backgroundColor: "var(--mixa-bg-elevated)",
            color: "var(--mixa-text-secondary)",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
