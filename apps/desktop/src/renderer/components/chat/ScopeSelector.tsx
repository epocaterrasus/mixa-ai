// Scope selector for filtering chat context to specific projects/tags

import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@mixa-ai/ui";
import type { ChatScope } from "@mixa-ai/types";

interface ScopeSelectorProps {
  scope: ChatScope;
  onChange: (scope: ChatScope) => void;
}

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 10px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-muted)",
  fontSize: "12px",
  cursor: "pointer",
  transition: "border-color 0.15s, color 0.15s",
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: "var(--mixa-accent-primary)",
  color: "var(--mixa-accent-primary)",
  backgroundColor: "rgba(99, 102, 241, 0.08)",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "100%",
  left: 0,
  marginBottom: "4px",
  width: "260px",
  backgroundColor: "var(--mixa-bg-elevated)",
  border: "1px solid var(--mixa-border-strong)",
  borderRadius: "8px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
  padding: "12px",
  zIndex: 100,
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--mixa-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "8px",
};

const infoStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--mixa-text-muted)",
  lineHeight: 1.5,
};

const clearButtonStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: "4px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: "11px",
  cursor: "pointer",
  marginTop: "8px",
};

function hasScope(scope: ChatScope): boolean {
  return scope.projectIds.length > 0 || scope.tagIds.length > 0 || scope.itemIds.length > 0;
}

export function ScopeSelector({ scope, onChange }: ScopeSelectorProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = hasScope(scope);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }
    return undefined;
  }, [isOpen, handleClickOutside]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        style={active ? activeButtonStyle : buttonStyle}
        onClick={() => { setIsOpen(!isOpen); }}
        title="Filter chat context"
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.borderColor = "var(--mixa-border-strong)";
            e.currentTarget.style.color = "var(--mixa-text-secondary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.borderColor = "var(--mixa-border-subtle)";
            e.currentTarget.style.color = "var(--mixa-text-muted)";
          }
        }}
      >
        <Icon name="search" size={14} /> {active ? "Scoped" : "All Knowledge"}
      </button>

      {isOpen && (
        <div style={dropdownStyle}>
          <div style={labelStyle}>Chat Scope</div>
          <div style={infoStyle}>
            Limit the knowledge context for this conversation. When scoped, only content from selected projects or tags will be used for answers.
          </div>
          <div style={{ ...infoStyle, marginTop: "12px", fontStyle: "italic" }}>
            Project and tag selection will be available after the Knowledge Browse tab is implemented (MIXA-019).
          </div>
          {active && (
            <button
              type="button"
              style={clearButtonStyle}
              onClick={() => {
                onChange({ projectIds: [], tagIds: [], itemIds: [] });
                setIsOpen(false);
              }}
            >
              Clear scope
            </button>
          )}
        </div>
      )}
    </div>
  );
}
