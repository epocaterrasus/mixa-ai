import type { TabType } from "@mixa-ai/types";
import { ChatTab } from "./chat/ChatTab";
import { CostDashboard } from "./dashboard/CostDashboard";
import { KnowledgeTab } from "./knowledge/KnowledgeTab";
import { SettingsTab } from "./settings/SettingsTab";
import { TerminalTab } from "./terminal/TerminalTab";

const newTabPageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  backgroundColor: "var(--mixa-bg-base)",
  color: "var(--mixa-text-primary)",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};


function NewTabPage(): React.ReactElement {
  return (
    <div style={newTabPageStyle}>
      <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px" }}>
        Mixa
      </h1>
      <p style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>Developer Browser</p>
    </div>
  );
}

/** Renders placeholder content for non-web tabs, or a new tab page for empty web tabs */
export function TabContent({
  type,
  hasUrl,
}: {
  type: TabType;
  hasUrl: boolean;
}): React.ReactElement {
  if (type === "web") {
    // Web tabs without a URL show the new tab page
    // Web tabs WITH a URL are rendered by the BrowserView (main process) — this component is not shown
    if (!hasUrl) {
      return <NewTabPage />;
    }
    // This shouldn't be visible when there's a URL (BrowserView covers it)
    return <div />;
  }

  // Chat tab renders the full ChatTab component
  if (type === "chat") {
    return <ChatTab />;
  }

  // Knowledge tab renders the knowledge browse/search UI
  if (type === "knowledge") {
    return <KnowledgeTab />;
  }

  // Settings tab renders the full settings panel
  if (type === "settings") {
    return <SettingsTab />;
  }

  // Terminal tab renders the Fenix engine UI via gRPC streaming
  if (type === "terminal") {
    return <TerminalTab />;
  }

  // Dashboard tab renders the cost dashboard
  if (type === "dashboard") {
    return <CostDashboard />;
  }

  return <div />;
}
