// Chat message input with send button

import { useState, useRef, useCallback } from "react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: "8px",
  padding: "12px 24px 16px",
  borderTop: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-base)",
};

const textareaStyle: React.CSSProperties = {
  flex: 1,
  minHeight: "40px",
  maxHeight: "160px",
  padding: "10px 14px",
  borderRadius: "12px",
  border: "1px solid var(--mixa-border-strong)",
  backgroundColor: "var(--mixa-bg-surface)",
  color: "var(--mixa-text-primary)",
  fontSize: "14px",
  fontFamily: "inherit",
  lineHeight: 1.5,
  resize: "none",
  outline: "none",
  overflow: "auto",
};

const sendButtonStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "var(--mixa-accent-primary)",
  color: "#fff",
  fontSize: "16px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "opacity 0.15s",
};

const sendButtonDisabledStyle: React.CSSProperties = {
  ...sendButtonStyle,
  opacity: 0.4,
  cursor: "not-allowed",
};

export function MessageInput({ onSend, disabled }: MessageInputProps): React.ReactElement {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "40px";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, []);

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div style={containerStyle}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); }}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={disabled ? "Waiting for response..." : "Ask Mixa anything... (Enter to send, Shift+Enter for newline)"}
        disabled={disabled}
        rows={1}
        style={{
          ...textareaStyle,
          opacity: disabled ? 0.6 : 1,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--mixa-accent-primary)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--mixa-border-strong)";
        }}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        style={canSend ? sendButtonStyle : sendButtonDisabledStyle}
        title="Send message (Enter)"
      >
        {"\u2191"}
      </button>
    </div>
  );
}
