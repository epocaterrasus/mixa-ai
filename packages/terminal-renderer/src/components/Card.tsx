// @mixa-ai/terminal-renderer — Card component
// Renders info cards with title, content, and action buttons

import { useCallback, useState } from "react";
import type { UIAction, UIComponent, UIEvent } from "@mixa-ai/types";
import { buttonBase, token, spacing, typography, radii } from "../styles.js";

export interface CardProps {
  component: UIComponent;
  actions?: UIAction[];
  onEvent?: (event: UIEvent) => void;
  module: string;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: token("bgSurface"),
  border: `1px solid ${token("borderDefault")}`,
  borderRadius: radii.lg,
  padding: spacing[4],
  marginBottom: spacing[3],
  transition: "border-color 0.1s",
};

const cardHoverStyle: React.CSSProperties = {
  ...cardStyle,
  borderColor: token("borderStrong"),
};

const titleStyle: React.CSSProperties = {
  fontSize: typography.fontSize.md,
  fontWeight: typography.fontWeight.semibold,
  color: token("textPrimary"),
  margin: 0,
  marginBottom: spacing[2],
  fontFamily: typography.fontFamily.sans,
};

const contentStyle: React.CSSProperties = {
  fontSize: typography.fontSize.base,
  color: token("textSecondary"),
  lineHeight: typography.lineHeight.relaxed,
  margin: 0,
  fontFamily: typography.fontFamily.sans,
};

const actionsContainerStyle: React.CSSProperties = {
  display: "flex",
  gap: spacing[2],
  marginTop: spacing[3],
  flexWrap: "wrap",
};

export function Card({ component, actions, onEvent, module }: CardProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  const cardActions = actions ?? [];

  // Card content uses the first line as title, rest as body
  const content = component.content ?? "";
  const lines = content.split("\n");
  const title = lines[0] ?? "";
  const body = lines.slice(1).join("\n").trim();

  const handleAction = useCallback(
    (actionId: string) => {
      onEvent?.({
        module,
        actionId,
        componentId: component.id,
        eventType: "click",
        data: {},
      });
    },
    [onEvent, module, component.id],
  );

  return (
    <div
      id={component.id}
      style={hovered ? cardHoverStyle : cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="article"
    >
      {title && <h3 style={titleStyle}>{title}</h3>}
      {body && <p style={contentStyle}>{body}</p>}
      {cardActions.length > 0 && (
        <div style={actionsContainerStyle}>
          {cardActions.map((action) => (
            <button
              key={action.id}
              style={{
                ...buttonBase,
                opacity: action.enabled ? 1 : 0.5,
                cursor: action.enabled ? "pointer" : "not-allowed",
              }}
              onClick={() => {
                if (action.enabled) handleAction(action.id);
              }}
              disabled={!action.enabled}
              aria-label={action.label}
            >
              {action.label}
              {action.shortcut && (
                <span
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: token("textMuted"),
                    marginLeft: spacing[1],
                  }}
                >
                  {action.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
