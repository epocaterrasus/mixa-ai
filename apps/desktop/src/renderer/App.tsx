import { TabBar } from "./components/TabBar";
import { Toolbar } from "./components/Toolbar";
import { TabContent } from "./components/TabContent";
import { FindBar } from "./components/FindBar";
import { Sidebar } from "./components/Sidebar";
import { CaptureToast } from "./components/CaptureToast";
import { useTabEvents } from "./hooks/useTabEvents";
import { useTabShortcuts } from "./hooks/useTabShortcuts";
import { useTabLifecycle } from "./hooks/useTabLifecycle";
import { useEngineStatus } from "./hooks/useEngineStatus";
import { useCapture } from "./hooks/useCapture";
import { useTabStore } from "./stores/tabs";

const styles = {
  root: {
    display: "flex",
    flexDirection: "row",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: "var(--mixa-bg-base)",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  } as React.CSSProperties,
  main: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  } as React.CSSProperties,
  content: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  } as React.CSSProperties,
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "var(--mixa-text-primary)",
  } as React.CSSProperties,
} as const;

function EmptyState(): React.ReactElement {
  const addTab = useTabStore((s) => s.addTab);

  return (
    <div style={styles.emptyState}>
      <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px" }}>
        Mixa
      </h1>
      <p style={{ fontSize: "13px", color: "var(--mixa-text-muted)", marginBottom: "24px" }}>
        Developer Browser
      </p>
      <button
        type="button"
        onClick={() => addTab("web")}
        style={{
          padding: "8px 20px",
          borderRadius: "8px",
          border: "1px solid var(--mixa-border-strong)",
          backgroundColor: "var(--mixa-bg-elevated)",
          color: "var(--mixa-text-primary)",
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        Open a new tab (Cmd+T)
      </button>
    </div>
  );
}

export function App(): React.ReactElement {
  // Wire up event listeners and lifecycle management
  useTabEvents();
  useTabShortcuts();
  useTabLifecycle();
  useEngineStatus();
  useCapture();

  const activeTab = useTabStore((s) => {
    const id = s.activeTabId;
    return s.tabs.find((t) => t.id === id);
  });
  const hasTabs = useTabStore((s) => s.tabs.length > 0);

  return (
    <div style={styles.root}>
      <Sidebar />
      <div style={styles.main}>
        <TabBar />
        <Toolbar />
        <div style={styles.content}>
          <FindBar />
          {activeTab ? (
            <TabContent type={activeTab.type} hasUrl={!!activeTab.url} />
          ) : hasTabs ? null : (
            <EmptyState />
          )}
        </div>
      </div>
      <CaptureToast />
    </div>
  );
}
