import type { TabType } from "@mixa-ai/types";
import { CanvasTab } from "./canvas/CanvasTab";
import { ChatTab } from "./chat/ChatTab";
import { CostDashboard } from "./dashboard/CostDashboard";
import { HealthDashboard } from "./dashboard/HealthDashboard";
import { KnowledgeDashboard } from "./dashboard/KnowledgeDashboard";
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

interface TabContentProps {
  tabId: string;
  type: TabType;
  hasUrl: boolean;
  url: string | null;
}

export function TabContent({ tabId, type, hasUrl, url }: TabContentProps): React.ReactElement {
  if (type === "web") {
    if (!hasUrl) {
      return <NewTabPage />;
    }
    return <div />;
  }

  if (type === "app") {
    return <div />;
  }

  if (type === "chat") {
    return <ChatTab />;
  }

  if (type === "knowledge") {
    return <KnowledgeTab />;
  }

  if (type === "settings") {
    return <SettingsTab />;
  }

  if (type === "canvas") {
    return <CanvasTab />;
  }

  if (type === "terminal") {
    return <TerminalTab tabId={tabId} />;
  }

  if (type === "dashboard") {
    if (url === "health") {
      return <HealthDashboard />;
    }
    if (url === "knowledge") {
      return <KnowledgeDashboard />;
    }
    return <CostDashboard />;
  }

  return <div />;
}
