// @mixa-ai/terminal-renderer — Header component
// Renders H1/H2/H3 headings based on the level property

import type { UIComponent } from "@mixa-ai/types";
import { token, spacing, typography } from "../styles.js";

export interface HeaderProps {
  component: UIComponent;
}

const levelStyles: Record<number, React.CSSProperties> = {
  1: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    marginBottom: spacing[4],
  },
  2: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
    marginBottom: spacing[3],
  },
  3: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.tight,
    marginBottom: spacing[2],
  },
};

export function Header({ component }: HeaderProps): React.JSX.Element {
  const level = component.level ?? 1;
  const style: React.CSSProperties = {
    ...levelStyles[level] ?? levelStyles[1],
    color: token("textPrimary"),
    margin: 0,
    padding: 0,
    fontFamily: typography.fontFamily.sans,
  };

  const Tag = (`h${Math.min(Math.max(level, 1), 6)}`) as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  return (
    <Tag id={component.id} style={style}>
      {component.content ?? ""}
    </Tag>
  );
}
