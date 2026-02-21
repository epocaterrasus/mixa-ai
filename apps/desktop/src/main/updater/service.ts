// Auto-updater service — checks for updates on launch and periodically,
// downloads in background, notifies renderer of status changes.

import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import type { UpdateInfo, ProgressInfo } from "electron-updater";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "ready"
  | "error";

export interface UpdateState {
  status: UpdateStatus;
  version: string | null;
  releaseDate: string | null;
  downloadProgress: number | null;
  bytesPerSecond: number | null;
  transferred: number | null;
  total: number | null;
  error: string | null;
  currentVersion: string;
}

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const INITIAL_DELAY_MS = 5_000; // 5 seconds after launch

let state: UpdateState = {
  status: "idle",
  version: null,
  releaseDate: null,
  downloadProgress: null,
  bytesPerSecond: null,
  transferred: null,
  total: null,
  error: null,
  currentVersion: "",
};

let mainWindow: BrowserWindow | null = null;
let checkInterval: ReturnType<typeof setInterval> | null = null;

function broadcast(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updater:state-changed", state);
  }
}

function setState(patch: Partial<UpdateState>): void {
  state = { ...state, ...patch };
  broadcast();
}

function setupAutoUpdaterEvents(): void {
  // Don't auto-download — let user decide
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    setState({ status: "checking", error: null });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    setState({
      status: "available",
      version: info.version,
      releaseDate: info.releaseDate ?? null,
    });
  });

  autoUpdater.on("update-not-available", () => {
    setState({ status: "not-available" });
  });

  autoUpdater.on("download-progress", (progress: ProgressInfo) => {
    setState({
      status: "downloading",
      downloadProgress: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    setState({ status: "ready", downloadProgress: 100 });
  });

  autoUpdater.on("error", (err: Error) => {
    setState({
      status: "error",
      error: err.message,
    });
  });
}

function setupIPCHandlers(): void {
  ipcMain.handle("updater:get-state", () => {
    return state;
  });

  ipcMain.handle("updater:check", async () => {
    try {
      await autoUpdater.checkForUpdates();
    } catch {
      // Error is already handled by the "error" event
    }
  });

  ipcMain.handle("updater:download", async () => {
    try {
      await autoUpdater.downloadUpdate();
    } catch {
      // Error is already handled by the "error" event
    }
  });

  ipcMain.handle("updater:install", () => {
    autoUpdater.quitAndInstall(false, true);
  });
}

export function setupUpdater(window: BrowserWindow): void {
  mainWindow = window;
  state.currentVersion = app.getVersion();

  setupAutoUpdaterEvents();
  setupIPCHandlers();

  // In development, skip actual update checks
  if (!app.isPackaged) {
    return;
  }

  // Initial check after delay
  setTimeout(() => {
    void autoUpdater.checkForUpdates();
  }, INITIAL_DELAY_MS);

  // Periodic checks every 4 hours
  checkInterval = setInterval(() => {
    void autoUpdater.checkForUpdates();
  }, CHECK_INTERVAL_MS);
}

export function cleanupUpdater(): void {
  if (checkInterval !== null) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}
