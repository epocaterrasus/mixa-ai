import { TabBar } from "./components/TabBar";
import { Toolbar } from "./components/Toolbar";
import { TabContent } from "./components/TabContent";
import { FindBar } from "./components/FindBar";
import { Sidebar } from "./components/Sidebar";
import { CaptureToast } from "./components/CaptureToast";
import { UpdateNotification } from "./components/UpdateNotification";
import { OnboardingOverlay } from "./components/onboarding/OnboardingOverlay";
import { useTabEvents } from "./hooks/useTabEvents";
import { useTabShortcuts } from "./hooks/useTabShortcuts";
import { useTabLifecycle } from "./hooks/useTabLifecycle";
import { useEngineStatus } from "./hooks/useEngineStatus";
import { useCapture } from "./hooks/useCapture";
import { useAugmentedBrowsing } from "./hooks/useAugmentedBrowsing";
import { useUpdater } from "./hooks/useUpdater";
import { useMediaBar } from "./hooks/useMediaBar";
import { RelatedItemsPanel } from "./components/RelatedItemsPanel";
import { MediaBar } from "./components/MediaBar";
import { useTabStore } from "./stores/tabs";
import { useMediaBarStore } from "./stores/mediaBar";

const styles = {
  root: {
    display: "flex",
    flexDirection: "row",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: "var(--mixa-bg-base)",
    fontFamily: "var(--mixa-font-sans)",
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
  tabPane: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  } as React.CSSProperties,
  tabPaneHidden: {
    position: "absolute",
    inset: 0,
    display: "none",
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
  useTabEvents();
  useTabShortcuts();
  useTabLifecycle();
  useEngineStatus();
  useCapture();
  useAugmentedBrowsing();
  useUpdater();
  useMediaBar();

  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const mediaBarPosition = useMediaBarStore((s) => s.position);

  return (
    <div style={styles.root}>
      <Sidebar />
      <div style={styles.main}>
        <TabBar />
        <Toolbar />
        {mediaBarPosition === "top" && <MediaBar />}
        <div style={styles.content}>
          <FindBar />
          {tabs.length > 0 ? (
            tabs.map((tab) => (
              <div
                key={tab.id}
                style={tab.id === activeTabId ? styles.tabPane : styles.tabPaneHidden}
              >
                <TabContent
                  tabId={tab.id}
                  type={tab.type}
                  hasUrl={!!tab.url}
                  url={tab.url}
                />
              </div>
            ))
          ) : (
            <EmptyState />
          )}
        </div>
        {mediaBarPosition === "bottom" && <MediaBar />}
      </div>
      <RelatedItemsPanel />
      <CaptureToast />
      <UpdateNotification />
      <OnboardingOverlay />
    </div>
  );
}
