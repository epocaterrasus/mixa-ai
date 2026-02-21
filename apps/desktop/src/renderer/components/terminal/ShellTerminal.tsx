// ShellTerminal — xterm.js-based raw shell terminal component
// Connects to node-pty in main process via IPC

import { useEffect, useRef, useCallback, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: "#1e1e1e",
};

const terminalWrapperStyle: React.CSSProperties = {
  flex: 1,
  position: "relative",
  overflow: "hidden",
};

const exitedOverlayStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "16px",
  left: "50%",
  transform: "translateX(-50%)",
  padding: "8px 16px",
  borderRadius: "6px",
  backgroundColor: "var(--mixa-bg-elevated, #2d2d2d)",
  color: "var(--mixa-text-secondary, #999)",
  fontSize: "13px",
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const restartButtonStyle: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: "4px",
  border: "1px solid var(--mixa-border-default, #555)",
  backgroundColor: "var(--mixa-bg-surface, #333)",
  color: "var(--mixa-text-primary, #eee)",
  fontSize: "12px",
  cursor: "pointer",
};

interface ShellTerminalProps {
  shellId: string;
}

export function ShellTerminal({ shellId }: ShellTerminalProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const fontSizeRef = useRef(DEFAULT_FONT_SIZE);
  const [exited, setExited] = useState(false);

  const restart = useCallback(() => {
    const term = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    if (!term || !fitAddon) return;

    setExited(false);
    term.clear();
    term.reset();

    // Re-fit to get correct dimensions
    fitAddon.fit();
    const cols = term.cols;
    const rows = term.rows;
    void window.electronAPI.shell.create(shellId, cols, rows);
  }, [shellId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const terminal = new Terminal({
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Monaco, monospace",
      fontSize: fontSizeRef.current,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
        selectionBackground: "#264f78",
        black: "#1e1e1e",
        red: "#f44747",
        green: "#6a9955",
        yellow: "#d7ba7d",
        blue: "#569cd6",
        magenta: "#c586c0",
        cyan: "#4ec9b0",
        white: "#d4d4d4",
        brightBlack: "#808080",
        brightRed: "#f44747",
        brightGreen: "#6a9955",
        brightYellow: "#d7ba7d",
        brightBlue: "#569cd6",
        brightMagenta: "#c586c0",
        brightCyan: "#4ec9b0",
        brightWhite: "#ffffff",
      },
      cursorBlink: true,
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(container);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Create PTY process in main process
    const cols = terminal.cols;
    const rows = terminal.rows;
    void window.electronAPI.shell.create(shellId, cols, rows);

    // Forward terminal input to PTY
    const dataDisposable = terminal.onData((data: string) => {
      void window.electronAPI.shell.write(shellId, data);
    });

    // Listen for PTY output and write to terminal
    const removeDataListener = window.electronAPI.shell.onData((msg) => {
      if (msg.shellId === shellId) {
        terminal.write(msg.data);
      }
    });

    // Listen for PTY exit
    const removeExitListener = window.electronAPI.shell.onExit((msg) => {
      if (msg.shellId === shellId) {
        terminal.write(`\r\n\x1b[90m[Process exited with code ${msg.exitCode}]\x1b[0m\r\n`);
        setExited(true);
      }
    });

    // Handle window resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      void window.electronAPI.shell.resize(shellId, terminal.cols, terminal.rows);
    });
    resizeObserver.observe(container);

    // Handle font size shortcuts (Cmd+= to increase, Cmd+- to decrease, Cmd+0 to reset)
    const handleKeyDown = (e: KeyboardEvent): void => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        const newSize = Math.min(fontSizeRef.current + 2, MAX_FONT_SIZE);
        fontSizeRef.current = newSize;
        terminal.options.fontSize = newSize;
        fitAddon.fit();
        void window.electronAPI.shell.resize(shellId, terminal.cols, terminal.rows);
      } else if (e.key === "-") {
        e.preventDefault();
        const newSize = Math.max(fontSizeRef.current - 2, MIN_FONT_SIZE);
        fontSizeRef.current = newSize;
        terminal.options.fontSize = newSize;
        fitAddon.fit();
        void window.electronAPI.shell.resize(shellId, terminal.cols, terminal.rows);
      } else if (e.key === "0") {
        e.preventDefault();
        fontSizeRef.current = DEFAULT_FONT_SIZE;
        terminal.options.fontSize = DEFAULT_FONT_SIZE;
        fitAddon.fit();
        void window.electronAPI.shell.resize(shellId, terminal.cols, terminal.rows);
      }
    };
    container.addEventListener("keydown", handleKeyDown);

    // Focus terminal
    terminal.focus();

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      resizeObserver.disconnect();
      dataDisposable.dispose();
      removeDataListener();
      removeExitListener();
      terminal.dispose();
      void window.electronAPI.shell.destroy(shellId);
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [shellId]);

  return (
    <div style={containerStyle}>
      <div ref={containerRef} style={terminalWrapperStyle} />
      {exited && (
        <div style={exitedOverlayStyle}>
          <span>Shell exited</span>
          <button type="button" onClick={restart} style={restartButtonStyle}>
            Restart
          </button>
        </div>
      )}
    </div>
  );
}
