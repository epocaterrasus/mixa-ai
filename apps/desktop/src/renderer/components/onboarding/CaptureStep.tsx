// Onboarding Step 4: Capture — prompt user to save a page

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
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
  lineHeight: 1.6,
  maxWidth: "420px",
  margin: 0,
};

const illustrationStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "400px",
  padding: "24px",
  borderRadius: "12px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-base)",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const stepRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  textAlign: "left",
};

const stepNumberStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, var(--mixa-accent), #818cf8)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  fontWeight: 700,
  flexShrink: 0,
};

const stepTextStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--mixa-text-primary)",
  lineHeight: 1.4,
};

const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "4px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-surface)",
  fontFamily: "'SF Mono', Menlo, monospace",
  fontSize: "12px",
  color: "var(--mixa-text-secondary)",
};

interface CaptureInstruction {
  step: number;
  text: React.ReactNode;
}

const instructions: CaptureInstruction[] = [
  {
    step: 1,
    text: "Browse to any web page in a web tab",
  },
  {
    step: 2,
    text: (
      <>
        Press <kbd style={kbdStyle}>Cmd+S</kbd> to save the page to your knowledge base
      </>
    ),
  },
  {
    step: 3,
    text: "Mixa extracts the content, generates embeddings, and auto-tags it",
  },
];

export function CaptureStep(): React.ReactElement {
  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Save your first page</h2>
      <p style={descStyle}>
        Build your personal knowledge base by capturing web pages as you browse.
        Mixa extracts clean content, generates summaries, and makes everything searchable.
      </p>

      <div style={illustrationStyle}>
        {instructions.map((inst) => (
          <div key={inst.step} style={stepRowStyle}>
            <div style={stepNumberStyle}>{inst.step}</div>
            <div style={stepTextStyle}>{inst.text}</div>
          </div>
        ))}
      </div>

      <p style={{ ...descStyle, fontSize: "12px", marginTop: "4px" }}>
        You can also select text on any page and right-click to save a highlight.
      </p>
    </div>
  );
}
