// Conversation history sidebar for the chat tab

import type { ChatConversation } from "../../stores/chat";

interface ConversationSidebarProps {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

const sidebarStyle: React.CSSProperties = {
  width: "240px",
  borderRight: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-surface)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flexShrink: 0,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 12px 8px",
  borderBottom: "1px solid var(--mixa-border-default)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--mixa-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const newButtonStyle: React.CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: "14px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background-color 0.15s",
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "8px 0",
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "13px",
  color: "var(--mixa-text-secondary)",
  transition: "background-color 0.1s",
  borderLeft: "2px solid transparent",
};

const activeItemStyle: React.CSSProperties = {
  ...itemStyle,
  backgroundColor: "var(--mixa-bg-active)",
  color: "var(--mixa-text-primary)",
  borderLeftColor: "var(--mixa-accent-primary)",
};

const itemTitleStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  marginRight: "8px",
};

const deleteButtonStyle: React.CSSProperties = {
  width: "20px",
  height: "20px",
  borderRadius: "4px",
  border: "none",
  backgroundColor: "transparent",
  color: "var(--mixa-text-muted)",
  fontSize: "12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0,
  transition: "opacity 0.15s",
  flexShrink: 0,
};

const emptyStyle: React.CSSProperties = {
  padding: "24px 16px",
  textAlign: "center",
  color: "var(--mixa-text-muted)",
  fontSize: "12px",
  lineHeight: 1.5,
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelect,
  onDelete,
  onNew,
}: ConversationSidebarProps): React.ReactElement {
  return (
    <div style={sidebarStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>History</span>
        <button
          type="button"
          style={newButtonStyle}
          onClick={onNew}
          title="New conversation"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          +
        </button>
      </div>
      <div style={listStyle}>
        {conversations.length === 0 ? (
          <div style={emptyStyle}>
            No conversations yet. Start chatting to create one.
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <div
                key={conv.id}
                style={isActive ? activeItemStyle : itemStyle}
                onClick={() => { onSelect(conv.id); }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
                  }
                  const deleteBtn = e.currentTarget.querySelector("[data-delete]") as HTMLElement | null;
                  if (deleteBtn) deleteBtn.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                  const deleteBtn = e.currentTarget.querySelector("[data-delete]") as HTMLElement | null;
                  if (deleteBtn) deleteBtn.style.opacity = "0";
                }}
              >
                <div style={itemTitleStyle}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conv.title ?? "Untitled"}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--mixa-text-muted)", marginTop: "2px" }}>
                    {formatDate(conv.updatedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  data-delete=""
                  style={deleteButtonStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  title="Delete conversation"
                >
                  {"\u00D7"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
