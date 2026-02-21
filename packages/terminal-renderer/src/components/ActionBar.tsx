// @mixa-ai/terminal-renderer — ActionBar component
// Renders a row of action buttons with keyboard shortcut labels

import { useCallback, useEffect } from "react";
import type { UIAction, UIComponent, UIEvent } from "@mixa-ai/types";
import { buttonBase, token, spacing, typography } from "../styles.js";

export interface ActionBarProps {
  component: UIComponent;
  actions?: UIAction[];
  onEvent?: (event: UIEvent) => void;
  module: string;
}

const barStyle: React.CSSProperties = {
  display: "flex",
  gap: spacing[2],
  flexWrap: "wrap",
  padding: `${spacing[2]} 0`,
  marginBottom: spacing[3],
};

const shortcutBadgeStyle: React.CSSProperties = {
  fontSize: typography.fontSize.xs,
  fontFamily: typography.fontFamily.mono,
  color: token("textMuted"),
  backgroundColor: token("bgActive"),
  padding: `0 ${spacing[1]}`,
  borderRadius: "3px",
  marginLeft: spacing[1],
};

export function ActionBar({
  component,
  actions,
  onEvent,
  module,
}: ActionBarProps): React.JSX.Element {
  const barActions = actions ?? [];

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

  // Register keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const action of barActions) {
        if (!action.enabled || !action.shortcut) continue;
        const shortcut = action.shortcut.toLowerCase();
        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;

        // Parse simple shortcuts like "Ctrl+S", "Enter", "Escape"
        if (shortcut.includes("+")) {
          const parts = shortcut.split("+");
          const modifier = parts[0];
          const shortcutKey = parts[1];
          if (
            (modifier === "ctrl" || modifier === "cmd") &&
            ctrl &&
            key === shortcutKey
          ) {
            e.preventDefault();
            handleAction(action.id);
            return;
          }
        } else if (key === shortcut) {
          e.preventDefault();
          handleAction(action.id);
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [barActions, handleAction]);

  return (
    <div id={component.id} style={barStyle} role="toolbar" aria-label="Actions">
      {barActions.map((action) => (
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
          {action.shortcut && <span style={shortcutBadgeStyle}>{action.shortcut}</span>}
        </button>
      ))}
    </div>
  );
}
