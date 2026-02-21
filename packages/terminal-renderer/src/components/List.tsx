// @mixa-ai/terminal-renderer — List component
// Renders a selectable list with keyboard navigation (Arrow keys + Enter)

import { useCallback, useRef, useState } from "react";
import type { UIComponent, UIEvent } from "@mixa-ai/types";
import { token, spacing, typography, radii } from "../styles.js";

export interface ListProps {
  component: UIComponent;
  onEvent?: (event: UIEvent) => void;
  module: string;
}

const listContainerStyle: React.CSSProperties = {
  backgroundColor: token("bgSurface"),
  border: `1px solid ${token("borderDefault")}`,
  borderRadius: radii.lg,
  overflow: "hidden",
  marginBottom: spacing[3],
};

const listItemStyle: React.CSSProperties = {
  padding: `${spacing[2]} ${spacing[3]}`,
  color: token("textPrimary"),
  fontSize: typography.fontSize.base,
  fontFamily: typography.fontFamily.sans,
  cursor: "pointer",
  borderBottom: `1px solid ${token("borderSubtle")}`,
  transition: "background-color 0.1s",
  outline: "none",
};

const listItemActiveStyle: React.CSSProperties = {
  ...listItemStyle,
  backgroundColor: token("bgActive"),
};

const listItemSelectedStyle: React.CSSProperties = {
  ...listItemStyle,
  backgroundColor: token("bgActiveAccent"),
  borderLeft: `3px solid ${token("accentPrimary")}`,
};

export function List({ component, onEvent, module }: ListProps): React.JSX.Element {
  const items = component.items ?? [];
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const handleSelect = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      const item = items[index];
      if (item !== undefined) {
        onEvent?.({
          module,
          actionId: null,
          componentId: component.id,
          eventType: "click",
          data: { index: String(index), value: item },
        });
      }
    },
    [onEvent, module, component.id, items],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < items.length) {
            handleSelect(activeIndex);
          }
          break;
        case "Home":
          e.preventDefault();
          setActiveIndex(0);
          break;
        case "End":
          e.preventDefault();
          setActiveIndex(items.length - 1);
          break;
      }
    },
    [activeIndex, items.length, handleSelect],
  );

  const getItemStyle = (index: number): React.CSSProperties => {
    if (index === selectedIndex) return listItemSelectedStyle;
    if (index === activeIndex) return listItemActiveStyle;
    return listItemStyle;
  };

  return (
    <ul
      id={component.id}
      ref={listRef}
      style={listContainerStyle}
      role="listbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Selectable list"
      aria-activedescendant={activeIndex >= 0 ? `${component.id}-item-${activeIndex}` : undefined}
    >
      {items.map((item, idx) => (
        <li
          key={idx}
          id={`${component.id}-item-${idx}`}
          style={getItemStyle(idx)}
          role="option"
          aria-selected={idx === selectedIndex}
          onClick={() => handleSelect(idx)}
          onMouseEnter={() => setActiveIndex(idx)}
          onMouseLeave={() => setActiveIndex(-1)}
        >
          {item}
        </li>
      ))}
      {items.length === 0 && (
        <li style={{ ...listItemStyle, color: token("textMuted"), textAlign: "center" }}>
          No items
        </li>
      )}
    </ul>
  );
}
