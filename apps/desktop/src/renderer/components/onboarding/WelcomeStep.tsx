// Onboarding Step 1: Welcome — branding and value proposition

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
  border: "1px solid var(--mixa-border-default)",
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
  fontSize: "12px",
  color: "var(--mixa-text-muted)",
  lineHeight: 1.4,
};

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: "\u{1F310}",
    title: "Smart Browsing",
    description: "Full Chromium browser with AI-powered page understanding",
  },
  {
    icon: "\u{1F4DA}",
    title: "Knowledge Base",
    description: "Save and search everything you read with semantic search",
  },
  {
    icon: "\u{1F4AC}",
    title: "AI Chat",
    description: "Ask questions about your saved knowledge using RAG",
  },
  {
    icon: "\u{1F5A5}",
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
            <div style={featureTitleStyle}>
              <span aria-hidden="true">{f.icon}</span> {f.title}
            </div>
            <div style={featureDescStyle}>{f.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
