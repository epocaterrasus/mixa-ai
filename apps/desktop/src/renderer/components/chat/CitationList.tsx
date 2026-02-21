// Citation chips displayed below AI responses

import type { Citation } from "@mixa-ai/types";
import { useTabStore } from "../../stores/tabs";

interface CitationListProps {
  citations: Citation[];
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginTop: "8px",
  paddingTop: "8px",
  borderTop: "1px solid var(--mixa-border-default)",
};

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "3px 8px",
  borderRadius: "4px",
  backgroundColor: "var(--mixa-bg-elevated)",
  border: "1px solid var(--mixa-border-default)",
  fontSize: "11px",
  color: "var(--mixa-text-secondary)",
  cursor: "pointer",
  transition: "border-color 0.15s, background-color 0.15s",
  maxWidth: "240px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const indexStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "16px",
  height: "16px",
  borderRadius: "3px",
  backgroundColor: "var(--mixa-accent-primary)",
  color: "#fff",
  fontSize: "10px",
  fontWeight: 700,
  flexShrink: 0,
};

export function CitationList({ citations }: CitationListProps): React.ReactElement | null {
  const addTab = useTabStore((s) => s.addTab);

  if (citations.length === 0) return null;

  function handleCitationClick(citation: Citation): void {
    if (citation.itemUrl) {
      addTab("web", citation.itemUrl);
    } else {
      // Open in knowledge tab when available
      addTab("knowledge");
    }
  }

  return (
    <div style={containerStyle}>
      <span style={{ fontSize: "11px", color: "var(--mixa-text-muted)", marginRight: "4px" }}>
        Sources:
      </span>
      {citations.map((citation) => (
        <button
          key={citation.index}
          type="button"
          style={chipStyle}
          title={citation.snippet}
          onClick={() => { handleCitationClick(citation); }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--mixa-accent-primary)";
            e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--mixa-border-default)";
            e.currentTarget.style.backgroundColor = "var(--mixa-bg-elevated)";
          }}
        >
          <span style={indexStyle}>{citation.index}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {citation.itemTitle}
          </span>
        </button>
      ))}
    </div>
  );
}
