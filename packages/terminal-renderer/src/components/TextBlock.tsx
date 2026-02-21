// @mixa-ai/terminal-renderer — TextBlock component
// Renders paragraph or preformatted text

import type { UIComponent } from "@mixa-ai/types";
import { token, spacing, typography } from "../styles.js";

export interface TextBlockProps {
  component: UIComponent;
}

const paragraphStyle: React.CSSProperties = {
  color: token("textSecondary"),
  fontSize: typography.fontSize.base,
  fontFamily: typography.fontFamily.sans,
  lineHeight: typography.lineHeight.relaxed,
  margin: 0,
  marginBottom: spacing[3],
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const preStyle: React.CSSProperties = {
  color: token("textPrimary"),
  fontSize: typography.fontSize.sm,
  fontFamily: typography.fontFamily.mono,
  lineHeight: typography.lineHeight.normal,
  margin: 0,
  marginBottom: spacing[3],
  padding: spacing[3],
  backgroundColor: token("bgElevated"),
  border: `1px solid ${token("borderSubtle")}`,
  borderRadius: "6px",
  overflow: "auto",
  whiteSpace: "pre",
};

export function TextBlock({ component }: TextBlockProps): React.JSX.Element {
  if (component.preformatted) {
    return (
      <pre id={component.id} style={preStyle}>
        {component.content ?? ""}
      </pre>
    );
  }

  return (
    <p id={component.id} style={paragraphStyle}>
      {component.content ?? ""}
    </p>
  );
}
