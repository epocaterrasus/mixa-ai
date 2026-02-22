// Shell IPC handler — manages PTY processes for xterm.js shell tabs
// Each shell tab gets its own PTY process identified by shellId (= tabId)

import { ipcMain, type WebContents } from "electron";
import * as pty from "node-pty";
import { platform, homedir } from "node:os";
import { existsSync } from "node:fs";

/** Active PTY process tracked per shell tab */
interface ActiveShell {
  process: pty.IPty;
  module: string;
}

/** Map of shellId (tabId) → active PTY process */
const activeShells = new Map<string, ActiveShell>();

/** IPC payload for creating a new shell */
interface ShellCreateRequest {
  shellId: string;
  cols: number;
  rows: number;
}

/** IPC payload for writing data to a shell */
interface ShellWriteRequest {
  shellId: string;
  data: string;
}

/** IPC payload for resizing a shell */
interface ShellResizeRequest {
  shellId: string;
  cols: number;
  rows: number;
}

/** IPC payload for destroying a shell */
interface ShellDestroyRequest {
  shellId: string;
}

interface ShellCreateResult {
  success: boolean;
  error?: string;
}

const UNIX_SHELL_CANDIDATES = ["/bin/zsh", "/bin/bash", "/bin/sh"];

function getShellCandidates(): string[] {
  if (platform() === "win32") {
    return [process.env["COMSPEC"] || "cmd.exe"];
  }

  const preferred = process.env["SHELL"];
  const candidates = preferred
    ? [preferred, ...UNIX_SHELL_CANDIDATES.filter((s) => s !== preferred)]
    : UNIX_SHELL_CANDIDATES;

  return candidates.filter((s) => existsSync(s));
}

function buildCleanEnv(): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

function createShell(
  sender: WebContents,
  shellId: string,
  cols: number,
  rows: number,
): ShellCreateResult {
  destroyShell(shellId);

  const candidates = getShellCandidates();
  if (candidates.length === 0) {
    const msg = "No shell executable found on this system";
    console.error(`[shell] ${msg}`);
    return { success: false, error: msg };
  }

  const home = homedir();
  const env = buildCleanEnv();
  const safeCols = Math.max(cols, 1);
  const safeRows = Math.max(rows, 1);

  let lastError: Error | undefined;

  for (const shell of candidates) {
    try {
      const ptyProcess = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols: safeCols,
        rows: safeRows,
        cwd: home,
        env,
      });

      activeShells.set(shellId, { process: ptyProcess, module: "shell" });

      ptyProcess.onData((data: string) => {
        if (sender.isDestroyed()) {
          destroyShell(shellId);
          return;
        }
        sender.send("shell:data", { shellId, data });
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        activeShells.delete(shellId);
        if (!sender.isDestroyed()) {
          sender.send("shell:exit", { shellId, exitCode, signal });
        }
      });

      console.log(`[shell] Spawned ${shell} for ${shellId}`);
      return { success: true };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[shell] Failed to spawn ${shell}: ${lastError.message}`);
    }
  }

  const msg = `Failed to spawn shell (tried ${candidates.join(", ")}): ${lastError?.message ?? "unknown error"}`;
  console.error(`[shell] ${msg}`);
  return { success: false, error: msg };
}

function destroyShell(shellId: string): void {
  const active = activeShells.get(shellId);
  if (active) {
    active.process.kill();
    activeShells.delete(shellId);
  }
}

export function setupShellHandlers(): void {
  ipcMain.handle(
    "shell:create",
    (_event, data: ShellCreateRequest): ShellCreateResult => {
      return createShell(_event.sender, data.shellId, data.cols, data.rows);
    },
  );

  // Write data (user input) to a PTY process
  ipcMain.handle(
    "shell:write",
    (_event, data: ShellWriteRequest): void => {
      const active = activeShells.get(data.shellId);
      if (active) {
        active.process.write(data.data);
      }
    },
  );

  // Resize a PTY process
  ipcMain.handle(
    "shell:resize",
    (_event, data: ShellResizeRequest): void => {
      const active = activeShells.get(data.shellId);
      if (active) {
        active.process.resize(
          Math.max(data.cols, 1),
          Math.max(data.rows, 1),
        );
      }
    },
  );

  // Destroy a PTY process when a shell tab is closed
  ipcMain.handle(
    "shell:destroy",
    (_event, data: ShellDestroyRequest): void => {
      destroyShell(data.shellId);
    },
  );
}

/** Clean up all active PTY processes (called during app shutdown) */
export function cleanupShells(): void {
  for (const [shellId] of activeShells) {
    destroyShell(shellId);
  }
}
