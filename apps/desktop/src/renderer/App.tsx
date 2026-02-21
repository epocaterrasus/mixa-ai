export function App(): React.ReactElement {
  const versions = window.electronAPI?.versions;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        backgroundColor: "#0a0a0a",
        color: "#fafafa",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Mixa</h1>
      <p style={{ color: "#888", marginBottom: "2rem" }}>Developer Browser</p>
      {versions ? (
        <div style={{ fontSize: "0.75rem", color: "#555" }}>
          <span>Electron {versions.electron}</span>
          {" | "}
          <span>Chromium {versions.chrome}</span>
          {" | "}
          <span>Node {versions.node}</span>
        </div>
      ) : null}
    </div>
  );
}
