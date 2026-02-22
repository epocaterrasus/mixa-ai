import { useCallback, useEffect, useRef, useState } from "react";
import type { UIEvent, UIAction, EngineModule } from "@mixa-ai/types";
import { UIViewRenderer } from "@mixa-ai/terminal-renderer";
import { useTabStore } from "../../stores/tabs";
import { useEngineStore } from "../../stores/engine";
import { useTerminalStream, type TerminalStreamState } from "../../hooks/useTerminalStream";
import { ShellTerminal } from "./ShellTerminal";

type TerminalMode = "fenix" | "shell";

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: "var(--mixa-bg-base)",
  color: "var(--mixa-text-primary)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  outline: "none",
};

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 16px",
  borderBottom: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-surface)",
  flexShrink: 0,
};

const moduleSelectStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-elevated)",
  color: "var(--mixa-text-primary)",
  fontSize: "13px",
  outline: "none",
  cursor: "pointer",
};

const modeToggleStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 10px",
  borderRadius: "4px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: active ? "var(--mixa-accent-blue, #569cd6)" : "var(--mixa-bg-elevated)",
  color: active ? "#ffffff" : "var(--mixa-text-secondary)",
  fontSize: "12px",
  fontWeight: active ? 600 : 400,
  cursor: "pointer",
  transition: "background-color 150ms ease, color 150ms ease",
});

const statusDotStyle = (state: TerminalStreamState): React.CSSProperties => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor:
    state === "streaming"
      ? "#22c55e"
      : state === "connecting"
        ? "#f59e0b"
        : state === "error"
          ? "#ef4444"
          : "var(--mixa-text-muted)",
  transition: "background-color 200ms ease",
});

const statusTextStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--mixa-text-muted)",
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: "auto",
  transition: "opacity 150ms ease",
};

const centerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  gap: "12px",
};

const errorBoxStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  gap: "12px",
  padding: "24px",
};

const errorTextStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#ef4444",
  textAlign: "center",
  maxWidth: "400px",
};

const reconnectButtonStyle: React.CSSProperties = {
  padding: "6px 16px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-elevated)",
  color: "var(--mixa-text-primary)",
  fontSize: "13px",
  cursor: "pointer",
};

const moduleLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--mixa-text-secondary)",
};

function getStatusLabel(state: TerminalStreamState): string {
  switch (state) {
    case "idle":
      return "Select a module";
    case "connecting":
      return "Connecting...";
    case "streaming":
      return "Connected";
    case "error":
      return "Error";
    case "disconnected":
      return "Disconnected";
  }
}

function keyboardEventToShortcut(e: React.KeyboardEvent): string | null {
  if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
    return null;
  }

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");

  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  parts.push(key);

  return parts.join("+");
}

interface TerminalTabProps {
  tabId: string;
}

export function TerminalTab({ tabId }: TerminalTabProps): React.ReactElement {
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId));
  const updateTab = useTabStore((s) => s.updateTab);
  const engineConnected = useEngineStore((s) => s.connected);
  const engineModules = useEngineStore((s) => s.modules);

  const initialMode: TerminalMode = tab?.url === "shell" ? "shell" : "fenix";
  const [mode, setMode] = useState<TerminalMode>(initialMode);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { view, state, error, sendEvent, reconnect } = useTerminalStream(
    tabId,
    mode === "fenix" ? selectedModule : null,
  );

  const handleModuleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setSelectedModule(value || null);
    },
    [],
  );

  const handleEvent = useCallback(
    (event: UIEvent) => {
      sendEvent(event);
    },
    [sendEvent],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (mode !== "fenix" || !selectedModule || !view) return;

      const shortcut = keyboardEventToShortcut(e);
      if (!shortcut) return;

      const matchingAction = view.actions.find(
        (a: UIAction) => a.enabled && a.shortcut === shortcut,
      );

      if (matchingAction) {
        e.preventDefault();
        e.stopPropagation();
        sendEvent({
          module: selectedModule,
          actionId: matchingAction.id,
          componentId: null,
          eventType: "shortcut",
          data: { shortcut },
        });
      }
    },
    [mode, selectedModule, view, sendEvent],
  );

  const enabledModules = engineModules.filter((m: EngineModule) => m.enabled);

  const activeModule = enabledModules.find((m) => m.name === selectedModule);
  useEffect(() => {
    if (mode === "shell") {
      updateTab(tabId, { title: "Shell" });
    } else {
      const title = activeModule
        ? `Terminal - ${activeModule.displayName || activeModule.name}`
        : "Terminal";
      updateTab(tabId, { title });
    }
  }, [tabId, mode, activeModule, updateTab]);

  useEffect(() => {
    if (mode === "fenix" && state === "streaming" && containerRef.current) {
      containerRef.current.focus();
    }
  }, [mode, state]);

  const switchToFenix = useCallback(() => setMode("fenix"), []);
  const switchToShell = useCallback(() => setMode("shell"), []);

  // Shell mode
  if (mode === "shell") {
    return (
      <div style={containerStyle}>
        <div style={toolbarStyle}>
          <button
            type="button"
            style={modeToggleStyle(false)}
            onClick={switchToFenix}
            aria-label="Switch to Fenix UI mode"
          >
            Fenix
          </button>
          <button
            type="button"
            style={modeToggleStyle(true)}
            onClick={switchToShell}
            aria-label="Shell mode active"
          >
            Shell
          </button>
          <div style={{ flex: 1 }} />
          <span style={statusTextStyle}>Raw shell</span>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ShellTerminal shellId={tabId} />
        </div>
      </div>
    );
  }

  // Fenix mode — engine not connected
  if (!engineConnected) {
    return (
      <div style={containerStyle}>
        <div style={toolbarStyle}>
          <button
            type="button"
            style={modeToggleStyle(true)}
            onClick={switchToFenix}
            aria-label="Fenix mode active"
          >
            Fenix
          </button>
          <button
            type="button"
            style={modeToggleStyle(false)}
            onClick={switchToShell}
            aria-label="Switch to Shell mode"
          >
            Shell
          </button>
        </div>
        <div style={centerStyle}>
          <div style={{ fontSize: "32px" }}>&#x26A0;&#xFE0F;</div>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>Engine Not Connected</div>
          <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
            The Fenix engine is not running. Switch to Shell mode or wait for it to start.
          </div>
        </div>
      </div>
    );
  }

  // Fenix mode — connected
  return (
    <div
      ref={containerRef}
      style={containerStyle}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Terminal module view"
    >
      <div style={toolbarStyle}>
        <button
          type="button"
          style={modeToggleStyle(true)}
          onClick={switchToFenix}
          aria-label="Fenix mode active"
        >
          Fenix
        </button>
        <button
          type="button"
          style={modeToggleStyle(false)}
          onClick={switchToShell}
          aria-label="Switch to Shell mode"
        >
          Shell
        </button>

        <span style={{ ...moduleLabelStyle, marginLeft: "8px" }}>Module:</span>
        <select
          value={selectedModule ?? ""}
          onChange={handleModuleChange}
          style={moduleSelectStyle}
          aria-label="Select engine module"
        >
          <option value="">-- Select module --</option>
          {enabledModules.map((m: EngineModule) => (
            <option key={m.name} value={m.name}>
              {m.displayName || m.name}
            </option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        <div style={statusDotStyle(state)} />
        <span style={statusTextStyle}>{getStatusLabel(state)}</span>

        {(state === "error" || state === "disconnected") && (
          <button
            type="button"
            onClick={reconnect}
            style={reconnectButtonStyle}
          >
            Reconnect
          </button>
        )}
      </div>

      <div style={contentStyle}>
        {state === "idle" && (
          <div style={centerStyle}>
            <div style={{ fontSize: "32px" }}>&#x25B6;&#xFE0F;</div>
            <div style={{ fontSize: "16px", fontWeight: 600 }}>Terminal</div>
            <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
              Select a module above to start
            </div>
          </div>
        )}

        {state === "connecting" && (
          <div style={centerStyle}>
            <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
              Connecting to {selectedModule}...
            </div>
          </div>
        )}

        {state === "error" && (
          <div style={errorBoxStyle}>
            <div style={{ fontSize: "32px" }}>&#x274C;</div>
            <div style={{ fontSize: "16px", fontWeight: 600 }}>Connection Error</div>
            <div style={errorTextStyle}>{error}</div>
            <button
              type="button"
              onClick={reconnect}
              style={reconnectButtonStyle}
            >
              Reconnect
            </button>
          </div>
        )}

        {state === "disconnected" && !view && (
          <div style={errorBoxStyle}>
            <div style={{ fontSize: "32px" }}>&#x1F50C;</div>
            <div style={{ fontSize: "16px", fontWeight: 600 }}>Stream Ended</div>
            <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
              The engine stream has ended.
            </div>
            <button
              type="button"
              onClick={reconnect}
              style={reconnectButtonStyle}
            >
              Reconnect
            </button>
          </div>
        )}

        {view && (
          <UIViewRenderer view={view} onEvent={handleEvent} />
        )}
      </div>
    </div>
  );
}
