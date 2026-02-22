// Chat message list with auto-scroll

import { useEffect, useRef } from "react";
import { Icon } from "@mixa-ai/ui";
import type { ChatMessage } from "../../stores/chat";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { CitationList } from "./CitationList";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

const containerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 24px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const userMessageStyle: React.CSSProperties = {
  alignSelf: "flex-end",
  maxWidth: "80%",
  backgroundColor: "var(--mixa-accent-primary)",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: "16px 16px 4px 16px",
  fontSize: "14px",
  lineHeight: 1.5,
  wordBreak: "break-word",
};

const assistantMessageStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  maxWidth: "85%",
  backgroundColor: "var(--mixa-bg-surface)",
  color: "var(--mixa-text-primary)",
  padding: "12px 16px",
  borderRadius: "4px 16px 16px 16px",
  fontSize: "14px",
  border: "1px solid var(--mixa-border-subtle)",
  wordBreak: "break-word",
};

const streamingIndicatorStyle: React.CSSProperties = {
  display: "inline-block",
  width: "8px",
  height: "16px",
  backgroundColor: "var(--mixa-accent-primary)",
  borderRadius: "1px",
  marginLeft: "2px",
  animation: "cursor-blink 1s step-end infinite",
  verticalAlign: "text-bottom",
};

const emptyStateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  color: "var(--mixa-text-muted)",
  gap: "12px",
  padding: "48px 24px",
  textAlign: "center",
};

export function MessageList({ messages, isStreaming }: MessageListProps): React.ReactElement {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    const suggestionStyle: React.CSSProperties = {
      padding: "10px 14px",
      borderRadius: "8px",
      border: "1px solid var(--mixa-border-subtle)",
      backgroundColor: "var(--mixa-bg-base)",
      fontSize: "14px",
      color: "var(--mixa-text-primary)",
      textAlign: "left",
      lineHeight: 1.4,
    };

    const tipStyle: React.CSSProperties = {
      padding: "10px 14px",
      borderRadius: "8px",
      backgroundColor: "rgba(99, 102, 241, 0.08)",
      border: "1px solid rgba(99, 102, 241, 0.2)",
      fontSize: "12px",
      color: "var(--mixa-text-secondary)",
      lineHeight: 1.5,
      textAlign: "left",
      maxWidth: "440px",
      width: "100%",
    };

    return (
      <div style={containerStyle}>
        <div style={emptyStateStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="chat" size={40} />
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--mixa-text-primary)" }}>
            Ask Mixa anything
          </div>
          <div style={{ fontSize: "14px", maxWidth: "440px", lineHeight: 1.5 }}>
            Chat uses RAG to search your saved knowledge and provide answers with citations.
            The more you save, the smarter your assistant becomes.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "440px", width: "100%", marginTop: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mixa-text-secondary)", textAlign: "left" }}>
              Try asking:
            </div>
            <div style={suggestionStyle}>
              &ldquo;Summarize what I saved about React Server Components&rdquo;
            </div>
            <div style={suggestionStyle}>
              &ldquo;What are the key differences between Bun and Node?&rdquo;
            </div>
            <div style={suggestionStyle}>
              &ldquo;Find articles I saved about database optimization&rdquo;
            </div>
          </div>

          <div style={tipStyle}>
            <strong>Tip:</strong> Save some web pages first (browse to a page and press Cmd+S), then come back
            here to ask questions about what you&apos;ve saved. You can also scope your chat to a specific
            project or tag using the scope selector above.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      {messages.map((message) => (
        <div
          key={message.id}
          style={message.role === "user" ? userMessageStyle : assistantMessageStyle}
        >
          {message.role === "user" ? (
            <span>{message.content}</span>
          ) : (
            <>
              {message.content ? (
                <MarkdownRenderer content={message.content} />
              ) : null}
              {message.isStreaming && (
                <span style={streamingIndicatorStyle} />
              )}
              {!message.isStreaming && message.citations.length > 0 && (
                <CitationList citations={message.citations} />
              )}
            </>
          )}
        </div>
      ))}
      {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
        <div style={assistantMessageStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={streamingIndicatorStyle} />
            <span style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
              Thinking...
            </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
