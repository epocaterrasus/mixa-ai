// Onboarding Step 3: Explore — quick tour of tab types

import { Icon } from "@mixa-ai/ui";
import type { IconName } from "@mixa-ai/ui";

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "var(--mixa-text-primary)",
  margin: 0,
};

const descStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--mixa-text-muted)",
  lineHeight: 1.5,
  margin: 0,
};

const tabListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const tabCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "14px",
  padding: "14px 16px",
  borderRadius: "8px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "var(--mixa-bg-base)",
};

const iconStyle: React.CSSProperties = {
  fontSize: "24px",
  lineHeight: 1,
  flexShrink: 0,
  marginTop: "2px",
};

const tabNameStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--mixa-text-primary)",
  marginBottom: "3px",
};

const tabDescStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--mixa-text-muted)",
  lineHeight: 1.4,
};

const shortcutStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 6px",
  borderRadius: "3px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "var(--mixa-bg-surface)",
  fontFamily: "'SF Mono', Menlo, monospace",
  fontSize: "11px",
  color: "var(--mixa-text-secondary)",
  marginLeft: "6px",
};

interface TabInfo {
  iconName: IconName;
  name: string;
  description: string;
  shortcut: string | null;
}

const tabTypes: TabInfo[] = [
  {
    iconName: "web",
    name: "Web Tabs",
    description: "Browse the web like any browser. Pages you visit can be saved to your knowledge base.",
    shortcut: "Cmd+T",
  },
  {
    iconName: "terminal",
    name: "Terminal",
    description: "Built-in terminal with shell access and Fenix engine modules for secrets, Git, and more.",
    shortcut: null,
  },
  {
    iconName: "knowledge",
    name: "Knowledge",
    description: "Browse, search, and manage everything you've saved. Supports full-text and semantic search.",
    shortcut: null,
  },
  {
    iconName: "chat",
    name: "Chat",
    description: "Ask questions about your saved knowledge. The AI uses RAG to find relevant context.",
    shortcut: null,
  },
];

export function ExploreStep(): React.ReactElement {
  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Your tab types</h2>
      <p style={descStyle}>
        Mixa has different tab types, each designed for a specific workflow.
        You can open them from the sidebar or the command palette (Cmd+K).
      </p>

      <div style={tabListStyle}>
        {tabTypes.map((tab) => (
          <div key={tab.name} style={tabCardStyle}>
            <span style={iconStyle} aria-hidden="true">
              <Icon name={tab.iconName} size={24} />
            </span>
            <div>
              <div style={tabNameStyle}>
                {tab.name}
                {tab.shortcut && <span style={shortcutStyle}>{tab.shortcut}</span>}
              </div>
              <div style={tabDescStyle}>{tab.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
