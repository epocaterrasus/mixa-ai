// @mixa-ai/terminal-renderer — StatusBar component
// Renders a bottom status bar with module info

import type { UIComponent } from "@mixa-ai/types";
import { token, spacing, typography } from "../styles.js";

export interface StatusBarProps {
  component: UIComponent;
}

const statusBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacing[1]} ${spacing[3]}`,
  backgroundColor: token("bgSurface"),
  borderTop: `1px solid ${token("borderDefault")}`,
  fontSize: typography.fontSize.xs,
  fontFamily: typography.fontFamily.sans,
  color: token("textMuted"),
  minHeight: "24px",
};

export function StatusBar({ component }: StatusBarProps): React.JSX.Element {
  const content = component.content ?? "";
  const parts = content.split("|").map((s) => s.trim());

  return (
    <div id={component.id} style={statusBarStyle} role="status" aria-label="Status bar">
      {parts.map((part, idx) => (
        <span key={idx}>{part}</span>
      ))}
    </div>
  );
}
