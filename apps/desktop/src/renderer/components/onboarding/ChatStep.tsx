// Onboarding Step 5: Chat — prompt user to try asking a question

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

const exampleBoxStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "400px",
  borderRadius: "12px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-base)",
  overflow: "hidden",
};

const exampleHeaderStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--mixa-text-secondary)",
  borderBottom: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-surface)",
};

const exampleListStyle: React.CSSProperties = {
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const exampleItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "13px",
  color: "var(--mixa-text-primary)",
  textAlign: "left",
};

const quoteBubbleStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: "8px",
  backgroundColor: "var(--mixa-bg-surface)",
  border: "1px solid var(--mixa-border-default)",
  fontStyle: "italic",
  lineHeight: 1.4,
};

const tipBoxStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "400px",
  padding: "12px 16px",
  borderRadius: "8px",
  backgroundColor: "rgba(99, 102, 241, 0.08)",
  border: "1px solid rgba(99, 102, 241, 0.2)",
  fontSize: "12px",
  color: "var(--mixa-text-secondary)",
  lineHeight: 1.5,
  textAlign: "left",
};

const exampleQuestions = [
  "Summarize what I saved about React Server Components",
  "What are the key differences between Bun and Node?",
  "Find articles I saved about database optimization",
];

export function ChatStep(): React.ReactElement {
  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Ask your knowledge base</h2>
      <p style={descStyle}>
        Once you&apos;ve saved some pages, open a Chat tab to ask questions.
        Mixa uses RAG to search your knowledge base and provide answers with citations.
      </p>

      <div style={exampleBoxStyle}>
        <div style={exampleHeaderStyle}>Try asking something like:</div>
        <div style={exampleListStyle}>
          {exampleQuestions.map((q) => (
            <div key={q} style={exampleItemStyle}>
              <span style={{ color: "var(--mixa-accent)", flexShrink: 0 }} aria-hidden="true">
                &#x2192;
              </span>
              <div style={quoteBubbleStyle}>{q}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={tipBoxStyle}>
        <strong>Tip:</strong> You can scope your chat to a specific project or tag
        to get more focused results. The more you save, the smarter your assistant becomes.
      </div>
    </div>
  );
}
