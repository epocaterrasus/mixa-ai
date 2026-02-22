// In-chat model selector — lets users override the default model per conversation

import { useMemo } from "react";
import { useChatStore } from "../../stores/chat";
import { useSettingsStore } from "../../stores/settings";

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
};

const selectStyle: React.CSSProperties = {
  padding: "3px 6px",
  paddingRight: "20px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-subtle)",
  backgroundColor: "transparent",
  color: "var(--mixa-text-secondary)",
  fontSize: "11px",
  fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace",
  cursor: "pointer",
  outline: "none",
  appearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 4px center",
  maxWidth: "200px",
};

function formatModelName(model: string): string {
  return model
    .replace("claude-sonnet-4-20250514", "Claude Sonnet 4")
    .replace("claude-opus-4-20250514", "Claude Opus 4")
    .replace("claude-haiku-4-20250414", "Claude Haiku 4")
    .replace("claude-3-5-sonnet-20241022", "Claude 3.5 Sonnet")
    .replace("claude-3-5-haiku-20241022", "Claude 3.5 Haiku")
    .replace("claude-3-opus-20240229", "Claude 3 Opus")
    .replace("gpt-4.1", "GPT-4.1")
    .replace("gpt-4.1-mini", "GPT-4.1 Mini")
    .replace("gpt-4.1-nano", "GPT-4.1 Nano")
    .replace("gpt-4o-mini", "GPT-4o Mini")
    .replace("gpt-4o", "GPT-4o")
    .replace("gpt-4-turbo", "GPT-4 Turbo")
    .replace("o3-mini", "o3-mini")
    .replace("o4-mini", "o4-mini")
    .replace("gemini-2.5-pro", "Gemini 2.5 Pro")
    .replace("gemini-2.5-flash", "Gemini 2.5 Flash")
    .replace("gemini-2.0-flash-lite", "Gemini 2.0 Flash Lite")
    .replace("gemini-2.0-flash", "Gemini 2.0 Flash")
    .replace("gemini-1.5-pro", "Gemini 1.5 Pro")
    .replace("gemini-1.5-flash", "Gemini 1.5 Flash");
}

export function ModelSelector(): React.ReactElement | null {
  const modelOverride = useChatStore((s) => s.modelOverride);
  const setModelOverride = useChatStore((s) => s.setModelOverride);
  const settings = useSettingsStore((s) => s.settings);

  const activeProvider = useMemo(() => {
    if (!settings) return null;
    return settings.llm.providers.find((p) => p.isActive) ?? null;
  }, [settings]);

  if (!activeProvider) return null;

  const currentModel = modelOverride ?? activeProvider.selectedModel;

  return (
    <div style={containerStyle}>
      <select
        value={currentModel}
        onChange={(e) => {
          const selected = e.target.value;
          if (selected === activeProvider.selectedModel) {
            setModelOverride(null);
          } else {
            setModelOverride(selected);
          }
        }}
        style={selectStyle}
        title="Select AI model for this conversation"
        aria-label="AI model"
      >
        {activeProvider.availableModels.map((model) => (
          <option key={model} value={model}>
            {formatModelName(model)}
            {model === activeProvider.selectedModel ? " (default)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
