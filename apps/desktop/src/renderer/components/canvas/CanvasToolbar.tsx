// Canvas toolbar — name input, save status, export, and tab embedding

import { useState, useCallback, useRef, useEffect } from "react";
import type { Tab } from "@mixa-ai/types";

// ─── Styles ──────────────────────────────────────────────────────

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 16px",
  borderBottom: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-surface)",
  flexShrink: 0,
  minHeight: "36px",
};

const nameInputStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  backgroundColor: "transparent",
  color: "var(--mixa-text-primary)",
  fontSize: "13px",
  fontWeight: 600,
  padding: "2px 6px",
  borderRadius: "4px",
  minWidth: "120px",
  maxWidth: "300px",
};

const statusStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--mixa-text-muted)",
  flexShrink: 0,
};

const spacerStyle: React.CSSProperties = {
  flex: 1,
};

const buttonStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: "5px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: "12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
  gap: "4px",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  backgroundColor: "var(--mixa-bg-elevated)",
  border: "1px solid var(--mixa-border-default)",
  borderRadius: "6px",
  padding: "4px 0",
  minWidth: "180px",
  zIndex: 100,
  boxShadow: "var(--mixa-shadow-dropdown)",
};

const dropdownItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "6px 12px",
  border: "none",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: "12px",
  textAlign: "left",
  cursor: "pointer",
};

const dropdownItemHoverStyle: React.CSSProperties = {
  backgroundColor: "var(--mixa-bg-active)",
  color: "var(--mixa-text-primary)",
};

// ─── Props ───────────────────────────────────────────────────────

interface CanvasToolbarProps {
  canvasName: string;
  onNameChange: (name: string) => void;
  isSaving: boolean;
  lastSaved: Date | null;
  onSave: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportJSON: () => void;
  embeddableTabs: Tab[];
  onEmbedTab: (tabId: string) => void;
}

// ─── Component ───────────────────────────────────────────────────

export function CanvasToolbar({
  canvasName,
  onNameChange,
  isSaving,
  lastSaved,
  onSave,
  onExportPNG,
  onExportSVG,
  onExportJSON,
  embeddableTabs,
  onEmbedTab,
}: CanvasToolbarProps): React.ReactElement {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showEmbedMenu, setShowEmbedMenu] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      const target = e.target as Node;
      if (exportRef.current && !exportRef.current.contains(target)) {
        setShowExportMenu(false);
      }
      if (embedRef.current && !embedRef.current.contains(target)) {
        setShowEmbedMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatLastSaved = useCallback(() => {
    if (!lastSaved) return "";
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    if (diff < 5) return "Saved";
    if (diff < 60) return `Saved ${diff}s ago`;
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    return `Saved at ${lastSaved.toLocaleTimeString()}`;
  }, [lastSaved]);

  return (
    <div style={toolbarStyle}>
      {/* Canvas name input */}
      <input
        type="text"
        value={canvasName}
        onChange={(e) => onNameChange(e.target.value)}
        style={nameInputStyle}
        placeholder="Untitled Canvas"
        aria-label="Canvas name"
        spellCheck={false}
      />

      {/* Save status */}
      <span style={statusStyle}>
        {isSaving ? "Saving..." : formatLastSaved()}
      </span>

      <div style={spacerStyle} />

      {/* Embed tab button */}
      {embeddableTabs.length > 0 && (
        <div ref={embedRef} style={{ position: "relative" }}>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => {
              setShowEmbedMenu(!showEmbedMenu);
              setShowExportMenu(false);
            }}
            aria-label="Embed a tab"
            title="Embed an open tab into the canvas"
          >
            Embed Tab
          </button>
          {showEmbedMenu && (
            <div style={dropdownStyle}>
              {embeddableTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  style={{
                    ...dropdownItemStyle,
                    ...(hoveredItem === `embed-${tab.id}` ? dropdownItemHoverStyle : {}),
                  }}
                  onClick={() => {
                    onEmbedTab(tab.id);
                    setShowEmbedMenu(false);
                  }}
                  onMouseEnter={() => setHoveredItem(`embed-${tab.id}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {tab.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save button */}
      <button
        type="button"
        style={buttonStyle}
        onClick={onSave}
        aria-label="Save canvas"
        title="Save canvas (Cmd+S)"
      >
        Save
      </button>

      {/* Export dropdown */}
      <div ref={exportRef} style={{ position: "relative" }}>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => {
            setShowExportMenu(!showExportMenu);
            setShowEmbedMenu(false);
          }}
          aria-label="Export canvas"
          title="Export canvas as PNG, SVG, or JSON"
        >
          Export
        </button>
        {showExportMenu && (
          <div style={dropdownStyle}>
            <button
              type="button"
              style={{
                ...dropdownItemStyle,
                ...(hoveredItem === "png" ? dropdownItemHoverStyle : {}),
              }}
              onClick={() => {
                onExportPNG();
                setShowExportMenu(false);
              }}
              onMouseEnter={() => setHoveredItem("png")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              Export as PNG
            </button>
            <button
              type="button"
              style={{
                ...dropdownItemStyle,
                ...(hoveredItem === "svg" ? dropdownItemHoverStyle : {}),
              }}
              onClick={() => {
                onExportSVG();
                setShowExportMenu(false);
              }}
              onMouseEnter={() => setHoveredItem("svg")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              Export as SVG
            </button>
            <button
              type="button"
              style={{
                ...dropdownItemStyle,
                ...(hoveredItem === "json" ? dropdownItemHoverStyle : {}),
              }}
              onClick={() => {
                onExportJSON();
                setShowExportMenu(false);
              }}
              onMouseEnter={() => setHoveredItem("json")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              Export as Excalidraw JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
