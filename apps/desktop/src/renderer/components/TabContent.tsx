import type { TabType } from "@mixa-ai/types";
import { ChatTab } from "./chat/ChatTab";
import { KnowledgeTab } from "./knowledge/KnowledgeTab";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    backgroundColor: "var(--mixa-bg-base)",
    color: "var(--mixa-text-primary)",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  } as React.CSSProperties,
  icon: {
    fontSize: "48px",
    marginBottom: "16px",
  } as React.CSSProperties,
  title: {
    fontSize: "18px",
    fontWeight: 600,
    marginBottom: "8px",
  } as React.CSSProperties,
  subtitle: {
    fontSize: "13px",
    color: "var(--mixa-text-muted)",
  } as React.CSSProperties,
} as const;

interface PlaceholderContent {
  icon: string;
  title: string;
  subtitle: string;
}

const placeholders: Record<Exclude<TabType, "web" | "chat" | "knowledge">, PlaceholderContent> = {
  terminal: {
    icon: "\u{25B6}\uFE0F",
    title: "Terminal",
    subtitle: "Terminal renderer coming in Sprint 3",
  },
  dashboard: {
    icon: "\u{1F4CA}",
    title: "Dashboard",
    subtitle: "Dashboards coming in Sprint 4",
  },
  settings: {
    icon: "\u{2699}\uFE0F",
    title: "Settings",
    subtitle: "Settings panel coming in Sprint 2",
  },
};

function NewTabPage(): React.ReactElement {
  return (
    <div style={styles.container}>
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

  const content = placeholders[type];

  return (
    <div style={styles.container}>
      <div style={styles.icon}>{content.icon}</div>
      <div style={styles.title}>{content.title}</div>
      <div style={styles.subtitle}>{content.subtitle}</div>
    </div>
  );
}
