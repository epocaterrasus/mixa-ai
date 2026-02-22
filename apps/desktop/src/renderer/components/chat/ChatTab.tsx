// Chat tab — full-height RAG chat interface

import { useEffect, useCallback } from "react";
import { Icon } from "@mixa-ai/ui";
import { useChatStore } from "../../stores/chat";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ConversationSidebar } from "./ConversationSidebar";
import { ScopeSelector } from "./ScopeSelector";

const containerStyle: React.CSSProperties = {
  display: "flex",
  height: "100%",
  backgroundColor: "var(--mixa-bg-base)",
  color: "var(--mixa-text-primary)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const mainStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
};

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 24px",
  borderBottom: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "var(--mixa-bg-surface)",
  flexShrink: 0,
};

const toolbarLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const toolbarRightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const sidebarToggleStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-muted)",
  fontSize: "13px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background-color 0.15s",
};

const newChatButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "4px 10px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: "12px",
  cursor: "pointer",
  transition: "background-color 0.15s",
};

const errorBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 24px",
  backgroundColor: "rgba(239, 68, 68, 0.1)",
  borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
  color: "#ef4444",
  fontSize: "13px",
};

const retryButtonStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: "4px",
  border: "1px solid #ef4444",
  backgroundColor: "transparent",
  color: "#ef4444",
  fontSize: "12px",
  cursor: "pointer",
};

// CSS keyframes for cursor blink (injected once)
const cursorBlinkCSS = `
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
`;

function injectStyles(): void {
  if (document.getElementById("mixa-chat-styles")) return;
  const style = document.createElement("style");
  style.id = "mixa-chat-styles";
  style.textContent = cursorBlinkCSS;
  document.head.appendChild(style);
}

export function ChatTab(): React.ReactElement {
  const {
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    error,
    showSidebar,
    scope,
    loadConversations,
    selectConversation,
    deleteConversation,
    sendMessage,
    setScope,
    toggleSidebar,
    clearError,
    newConversation,
    handleStreamChunk,
  } = useChatStore();

  // Inject CSS keyframes on mount
  useEffect(() => {
    injectStyles();
  }, []);

  // Load conversations on mount
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Set up IPC stream listener
  useEffect(() => {
    const cleanup = window.electronAPI.chat.onStreamChunk((data) => {
      handleStreamChunk(
        data.messageId,
        data.content,
        data.done,
        data.citations as Array<{
          index: number;
          itemId: string;
          chunkId: string;
          itemTitle: string;
          itemUrl: string | null;
          snippet: string;
        }>,
      );
    });
    return cleanup;
  }, [handleStreamChunk]);

  const handleSend = useCallback(
    (content: string) => {
      void sendMessage(content);
    },
    [sendMessage],
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      void selectConversation(id);
    },
    [selectConversation],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      void deleteConversation(id);
    },
    [deleteConversation],
  );

  return (
    <div style={containerStyle}>
      {showSidebar && (
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
          onNew={newConversation}
        />
      )}

      <div style={mainStyle}>
        {/* Toolbar */}
        <div style={toolbarStyle}>
          <div style={toolbarLeftStyle}>
            <button
              type="button"
              style={sidebarToggleStyle}
              onClick={toggleSidebar}
              title={showSidebar ? "Hide history" : "Show history"}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Icon name={showSidebar ? "collapse" : "expand"} size={16} />
            </button>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--mixa-text-primary)" }}>
              Chat
            </span>
            {activeConversationId && (
              <span style={{ fontSize: "12px", color: "var(--mixa-text-muted)" }}>
                {conversations.find((c) => c.id === activeConversationId)?.title ?? "Untitled"}
              </span>
            )}
          </div>
          <div style={toolbarRightStyle}>
            <ScopeSelector scope={scope} onChange={setScope} />
            <button
              type="button"
              style={newChatButtonStyle}
              onClick={newConversation}
              title="New conversation"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--mixa-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Icon name="add" size={12} /> New Chat
            </button>
          </div>
        </div>

        {/* Error bar */}
        {error && (
          <div style={errorBarStyle}>
            <span>{error}</span>
            <button
              type="button"
              style={retryButtonStyle}
              onClick={clearError}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Message list */}
        <MessageList messages={messages} isStreaming={isStreaming} />

        {/* Input */}
        <MessageInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
