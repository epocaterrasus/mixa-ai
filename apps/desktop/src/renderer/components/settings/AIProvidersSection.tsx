// AI Providers settings section — configure API keys, active provider, model selection

import { useState, useCallback } from "react";
import type { LLMProvider, LLMProviderName } from "@mixa-ai/types";
import { useSettingsStore } from "../../stores/settings";

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  marginBottom: "4px",
};

const sectionDescStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--mixa-text-muted)",
  marginBottom: "24px",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--mixa-border-default)",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
  backgroundColor: "var(--mixa-bg-surface)",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "12px",
};

const providerNameStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--mixa-text-secondary)",
  marginBottom: "4px",
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  border: "1px solid var(--mixa-border-default)",
  borderRadius: "6px",
  backgroundColor: "var(--mixa-bg-elevated)",
  color: "var(--mixa-text-primary)",
  fontSize: "13px",
  fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  cursor: "pointer",
};

const buttonStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-elevated)",
  color: "var(--mixa-text-primary)",
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "var(--mixa-accent-primary)",
  borderColor: "var(--mixa-accent-primary)",
  color: "#fff",
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  color: "#ef4444",
  borderColor: "rgba(239, 68, 68, 0.3)",
};

const statusBadgeStyle = (configured: boolean): React.CSSProperties => ({
  fontSize: "11px",
  padding: "2px 8px",
  borderRadius: "9999px",
  backgroundColor: configured
    ? "rgba(74, 222, 128, 0.15)"
    : "rgba(239, 68, 68, 0.15)",
  color: configured ? "#4ade80" : "#ef4444",
  fontWeight: 500,
});

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: "12px",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const dividerStyle: React.CSSProperties = {
  height: "1px",
  backgroundColor: "var(--mixa-border-subtle)",
  margin: "24px 0",
};

function ProviderCard({
  provider,
}: {
  provider: LLMProvider;
}): React.ReactElement {
  const { setActiveProvider, setSelectedModel, setApiKey, deleteApiKey } =
    useSettingsStore();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveKey = useCallback(async () => {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    try {
      await setApiKey(provider.name, apiKeyInput.trim());
      setApiKeyInput("");
      setShowKeyInput(false);
    } finally {
      setSaving(false);
    }
  }, [apiKeyInput, provider.name, setApiKey]);

  const handleDeleteKey = useCallback(async () => {
    await deleteApiKey(provider.name);
  }, [provider.name, deleteApiKey]);

  const isOllama = provider.name === "ollama";

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={providerNameStyle}>{provider.displayName}</span>
          <span style={statusBadgeStyle(provider.apiKeyConfigured)}>
            {provider.apiKeyConfigured ? "Configured" : "Not configured"}
          </span>
        </div>
        <button
          style={provider.isActive ? activeButtonStyle : buttonStyle}
          onClick={() => void setActiveProvider(provider.name)}
          aria-pressed={provider.isActive}
        >
          {provider.isActive ? "Active" : "Set Active"}
        </button>
      </div>

      {/* API Key */}
      {!isOllama && (
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>API Key</label>
          {provider.apiKeyConfigured && !showKeyInput ? (
            <div style={rowStyle}>
              <input
                type="password"
                value="sk-***********************"
                readOnly
                style={{ ...inputStyle, flex: 1, opacity: 0.6 }}
                tabIndex={-1}
              />
              <button
                style={buttonStyle}
                onClick={() => setShowKeyInput(true)}
              >
                Change
              </button>
              <button style={dangerButtonStyle} onClick={() => void handleDeleteKey()}>
                Remove
              </button>
            </div>
          ) : (
            <div style={rowStyle}>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={`Enter ${provider.displayName} API key`}
                style={{ ...inputStyle, flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveKey();
                }}
              />
              <button
                style={activeButtonStyle}
                onClick={() => void handleSaveKey()}
                disabled={saving || !apiKeyInput.trim()}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              {showKeyInput && (
                <button
                  style={buttonStyle}
                  onClick={() => {
                    setShowKeyInput(false);
                    setApiKeyInput("");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ollama Base URL */}
      {isOllama && (
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Base URL</label>
          <input
            type="text"
            value={provider.baseUrl ?? "http://localhost:11434"}
            readOnly
            style={{ ...inputStyle, opacity: 0.7 }}
          />
          <span
            style={{
              fontSize: "11px",
              color: "var(--mixa-text-muted)",
              marginTop: "4px",
              display: "block",
            }}
          >
            Local Ollama instance. Ensure ollama is running.
          </span>
        </div>
      )}

      {/* Model Selection */}
      {provider.availableModels.length > 0 && (
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Model</label>
          <select
            value={provider.selectedModel}
            onChange={(e) =>
              void setSelectedModel(
                provider.name,
                e.target.value,
              )
            }
            style={selectStyle}
          >
            {provider.availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export function AIProvidersSection(): React.ReactElement {
  const { settings, setEmbeddingConfig } = useSettingsStore();

  if (!settings) return <div />;

  const embeddingModels: Record<LLMProviderName, string[]> = {
    openai: ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
    anthropic: [],
    gemini: ["text-embedding-004"],
    ollama: ["nomic-embed-text", "mxbai-embed-large"],
  };

  return (
    <div>
      <div style={sectionTitleStyle}>AI Providers</div>
      <div style={sectionDescStyle}>
        Configure your LLM providers. Mixa uses BYOK (Bring Your Own Key) &mdash;
        your keys are stored securely in the OS keychain.
      </div>

      {settings.llm.providers.map((provider) => (
        <ProviderCard key={provider.name} provider={provider} />
      ))}

      <div style={dividerStyle} />

      <div style={{ ...sectionTitleStyle, fontSize: "15px" }}>
        Embedding Configuration
      </div>
      <div style={{ ...sectionDescStyle, marginBottom: "16px" }}>
        Choose which provider and model to use for generating text embeddings
        (used in knowledge search and RAG).
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Provider</label>
          <select
            value={settings.llm.embeddingProvider}
            onChange={(e) => {
              const provider = e.target.value as LLMProviderName;
              const models = embeddingModels[provider];
              void setEmbeddingConfig(provider, models[0] ?? "");
            }}
            style={selectStyle}
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="ollama">Ollama (Local)</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Model</label>
          <select
            value={settings.llm.embeddingModel}
            onChange={(e) =>
              void setEmbeddingConfig(
                settings.llm.embeddingProvider,
                e.target.value,
              )
            }
            style={selectStyle}
          >
            {(
              embeddingModels[settings.llm.embeddingProvider] ?? []
            ).map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
