// Shell IPC handler — manages PTY processes for xterm.js shell tabs
// Each shell tab gets its own PTY process identified by shellId (= tabId)

import { ipcMain, type WebContents } from "electron";
import * as pty from "node-pty";
import { platform, homedir, env } from "node:os";

/** Active PTY process tracked per shell tab */
interface ActiveShell {
  process: pty.IPty;
  module: string; // always "shell" for tracking
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

function getDefaultShell(): string {
  if (platform() === "win32") {
    return env()["COMSPEC"] || "cmd.exe";
  }
  return process.env["SHELL"] || "/bin/zsh";
}

function createShell(
  sender: WebContents,
  shellId: string,
  cols: number,
  rows: number,
): void {
  // Destroy any existing shell for this tab
  destroyShell(shellId);

  const shell = getDefaultShell();
  const home = homedir();

  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: Math.max(cols, 1),
    rows: Math.max(rows, 1),
    cwd: home,
    env: { ...process.env } as Record<string, string>,
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
}

function destroyShell(shellId: string): void {
  const active = activeShells.get(shellId);
  if (active) {
    active.process.kill();
    activeShells.delete(shellId);
  }
}

export function setupShellHandlers(): void {
  // Create a new PTY process for a shell tab
  ipcMain.handle(
    "shell:create",
    (event, data: ShellCreateRequest): void => {
      createShell(event.sender, data.shellId, data.cols, data.rows);
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
