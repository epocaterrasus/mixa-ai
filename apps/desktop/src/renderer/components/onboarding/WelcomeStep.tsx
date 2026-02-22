// Onboarding Step 1: Welcome — branding and value proposition

import { Icon } from "@mixa-ai/ui";
import type { IconName } from "@mixa-ai/ui";

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: "16px",
};

const logoStyle: React.CSSProperties = {
  width: "72px",
  height: "72px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, var(--mixa-accent), #818cf8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
  fontWeight: 700,
  color: "#fff",
  marginBottom: "8px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "var(--mixa-text-primary)",
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "var(--mixa-text-muted)",
  lineHeight: 1.6,
  maxWidth: "420px",
  margin: 0,
};

const featureGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  width: "100%",
  marginTop: "8px",
};

const featureCardStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: "8px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "var(--mixa-bg-base)",
  textAlign: "left",
};

const featureTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--mixa-text-primary)",
  marginBottom: "4px",
};

const featureDescStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--mixa-text-muted)",
  lineHeight: 1.4,
};

interface Feature {
  iconName: IconName;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    iconName: "web",
    title: "Smart Browsing",
    description: "Full Chromium browser with AI-powered page understanding",
  },
  {
    iconName: "knowledge",
    title: "Knowledge Base",
    description: "Save and search everything you read with semantic search",
  },
  {
    iconName: "chat",
    title: "AI Chat",
    description: "Ask questions about your saved knowledge using RAG",
  },
  {
    iconName: "terminal",
    title: "Dev Tools",
    description: "Terminal, secrets, Git, and infrastructure at your fingertips",
  },
];

export function WelcomeStep(): React.ReactElement {
  return (
    <div style={containerStyle}>
      <div style={logoStyle} aria-hidden="true">M</div>
      <h2 style={titleStyle}>Welcome to Mixa</h2>
      <p style={subtitleStyle}>
        The developer browser that unifies web browsing, knowledge management,
        and infrastructure tooling into one app.
      </p>
      <div style={featureGridStyle}>
        {features.map((f) => (
          <div key={f.title} style={featureCardStyle}>
            <div style={{ ...featureTitleStyle, display: "flex", alignItems: "center", gap: "6px" }}>
              <Icon name={f.iconName} size={14} />
              {f.title}
            </div>
            <div style={featureDescStyle}>{f.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
