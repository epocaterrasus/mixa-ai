// @mixa-ai/terminal-renderer — Shared style utilities
// Uses CSS custom properties from @mixa-ai/ui theme system

import { token, spacing, typography, radii } from "@mixa-ai/ui";

/** Shared container styles for terminal renderer components */
export const containerBase: React.CSSProperties = {
  fontFamily: typography.fontFamily.sans,
  fontSize: typography.fontSize.base,
  lineHeight: typography.lineHeight.normal,
  color: token("textPrimary"),
};

/** Shared card/panel style */
export const panelStyle: React.CSSProperties = {
  backgroundColor: token("bgSurface"),
  border: `1px solid ${token("borderDefault")}`,
  borderRadius: radii.lg,
  padding: spacing[4],
};

/** Shared button style */
export const buttonBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: spacing[2],
  padding: `${spacing[1]} ${spacing[3]}`,
  borderRadius: radii.md,
  border: `1px solid ${token("borderDefault")}`,
  backgroundColor: token("bgElevated"),
  color: token("textPrimary"),
  fontSize: typography.fontSize.sm,
  fontFamily: typography.fontFamily.sans,
  cursor: "pointer",
  lineHeight: typography.lineHeight.normal,
  transition: "background-color 0.1s, border-color 0.1s",
};

/** Disabled button overlay */
export const buttonDisabled: React.CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

/** Accent/primary button style */
export const buttonAccent: React.CSSProperties = {
  ...buttonBase,
  backgroundColor: token("accentPrimary"),
  borderColor: token("accentPrimary"),
  color: "#ffffff",
};

export { token, spacing, typography, radii };
