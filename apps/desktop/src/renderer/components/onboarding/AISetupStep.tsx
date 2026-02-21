// Onboarding Step 2: AI Setup — pick a provider and enter an API key

import { useState, useCallback } from "react";
import type { LLMProviderName } from "@mixa-ai/types";
import { useSettingsStore } from "../../stores/settings";

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "var(--mixa-text-primary)",
  margin: 0,
};

const descStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--mixa-text-muted)",
  lineHeight: 1.5,
  margin: 0,
};

const providerListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const providerBtnStyle = (isSelected: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 16px",
  borderRadius: "8px",
  border: isSelected
    ? "2px solid var(--mixa-accent)"
    : "1px solid var(--mixa-border-default)",
  backgroundColor: isSelected ? "rgba(99, 102, 241, 0.08)" : "var(--mixa-bg-base)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "13px",
  textAlign: "left" as const,
  width: "100%",
  color: "var(--mixa-text-primary)",
  transition: "border-color 0.15s, background-color 0.15s",
});

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--mixa-text-secondary)",
  marginBottom: "6px",
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--mixa-border-default)",
  borderRadius: "6px",
  backgroundColor: "var(--mixa-bg-elevated)",
  color: "var(--mixa-text-primary)",
  fontSize: "13px",
  fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace",
  outline: "none",
  boxSizing: "border-box" as const,
};

const saveBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-accent)",
  backgroundColor: "var(--mixa-accent)",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};

const statusStyle = (ok: boolean): React.CSSProperties => ({
  fontSize: "12px",
  padding: "6px 12px",
  borderRadius: "6px",
  backgroundColor: ok ? "rgba(74, 222, 128, 0.12)" : "rgba(239, 68, 68, 0.12)",
  color: ok ? "#4ade80" : "#ef4444",
  textAlign: "center" as const,
});

const hintStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--mixa-text-muted)",
  lineHeight: 1.4,
  marginTop: "4px",
};

interface ProviderOption {
  name: LLMProviderName;
  displayName: string;
  requiresKey: boolean;
}

const providers: ProviderOption[] = [
  { name: "openai", displayName: "OpenAI", requiresKey: true },
  { name: "anthropic", displayName: "Anthropic", requiresKey: true },
  { name: "gemini", displayName: "Google Gemini", requiresKey: true },
  { name: "ollama", displayName: "Ollama (Local)", requiresKey: false },
];

export function AISetupStep(): React.ReactElement {
  const { settings, setActiveProvider, setApiKey } = useSettingsStore();
  const [selected, setSelected] = useState<LLMProviderName>(() => {
    const active = settings?.llm.providers.find((p) => p.isActive);
    return active?.name ?? "openai";
  });
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedProvider = providers.find((p) => p.name === selected);
  const isConfigured = settings?.llm.providers.find((p) => p.name === selected)?.apiKeyConfigured ?? false;

  const handleSelect = useCallback(
    (name: LLMProviderName) => {
      setSelected(name);
      setSaved(false);
      setApiKeyInput("");
      void setActiveProvider(name);
    },
    [setActiveProvider],
  );

  const handleSave = useCallback(async () => {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    try {
      await setApiKey(selected, apiKeyInput.trim());
      setApiKeyInput("");
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }, [apiKeyInput, selected, setApiKey]);

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Set up your AI provider</h2>
      <p style={descStyle}>
        Mixa uses BYOK (Bring Your Own Key). Your API keys are stored securely
        in your OS keychain and never leave your machine.
      </p>

      <div style={providerListStyle}>
        {providers.map((p) => (
          <button
            key={p.name}
            type="button"
            style={providerBtnStyle(selected === p.name)}
            onClick={() => handleSelect(p.name)}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{p.displayName}</div>
              {!p.requiresKey && (
                <div style={{ fontSize: "11px", color: "var(--mixa-text-muted)", marginTop: "2px" }}>
                  No API key required &mdash; runs locally
                </div>
              )}
            </div>
            {selected === p.name && (
              <span style={{ color: "var(--mixa-accent)", fontSize: "16px" }} aria-hidden="true">
                &#x2713;
              </span>
            )}
          </button>
        ))}
      </div>

      {selectedProvider?.requiresKey && !isConfigured && (
        <div>
          <label style={labelStyle} htmlFor="onboarding-api-key">
            {selectedProvider.displayName} API Key
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              id="onboarding-api-key"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={`Enter your ${selectedProvider.displayName} API key`}
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
              }}
            />
            <button
              type="button"
              style={saveBtnStyle}
              onClick={() => void handleSave()}
              disabled={saving || !apiKeyInput.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          <div style={hintStyle}>
            You can always change this later in Settings.
          </div>
        </div>
      )}

      {(isConfigured || saved) && selectedProvider?.requiresKey && (
        <div style={statusStyle(true)}>
          API key configured successfully
        </div>
      )}

      {!selectedProvider?.requiresKey && selected === "ollama" && (
        <div style={statusStyle(true)}>
          Ollama runs locally &mdash; make sure ollama is running on your machine
        </div>
      )}
    </div>
  );
}
