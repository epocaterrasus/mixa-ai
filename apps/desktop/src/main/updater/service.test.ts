import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mocks must be set up before imports
const { mockHandle, mockOn, mockSend } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockOn: vi.fn(),
  mockSend: vi.fn(),
}));

const mockAutoUpdater = vi.hoisted(() => {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  return {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners.set(event, handler);
    }),
    checkForUpdates: vi.fn().mockResolvedValue(undefined),
    downloadUpdate: vi.fn().mockResolvedValue(undefined),
    quitAndInstall: vi.fn(),
    _listeners: listeners,
    _emit: (event: string, ...args: unknown[]) => {
      const handler = listeners.get(event);
      if (handler) handler(...args);
    },
  };
});

vi.mock("electron", () => ({
  app: {
    getVersion: () => "1.0.0",
    isPackaged: false,
  },
  BrowserWindow: vi.fn(),
  ipcMain: {
    handle: mockHandle,
    on: mockOn,
  },
}));

vi.mock("electron-updater", () => ({
  autoUpdater: mockAutoUpdater,
}));

import { setupUpdater, cleanupUpdater } from "./service.js";
import type { BrowserWindow } from "electron";

function getHandler(channel: string): ((...args: unknown[]) => unknown) | undefined {
  for (const call of mockHandle.mock.calls) {
    if (call[0] === channel) {
      return call[1] as (...args: unknown[]) => unknown;
    }
  }
  return undefined;
}

function createMockWindow(): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: {
      send: mockSend,
    },
  } as unknown as BrowserWindow;
}

describe("Updater Service", () => {
  let mockWindow: BrowserWindow;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAutoUpdater._listeners.clear();
    mockWindow = createMockWindow();
    setupUpdater(mockWindow);
  });

  afterEach(() => {
    cleanupUpdater();
  });

  it("registers IPC handlers on setup", () => {
    const channels = mockHandle.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(channels).toContain("updater:get-state");
    expect(channels).toContain("updater:check");
    expect(channels).toContain("updater:download");
    expect(channels).toContain("updater:install");
  });

  it("registers autoUpdater event listeners", () => {
    const events = mockAutoUpdater.on.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(events).toContain("checking-for-update");
    expect(events).toContain("update-available");
    expect(events).toContain("update-not-available");
    expect(events).toContain("download-progress");
    expect(events).toContain("update-downloaded");
    expect(events).toContain("error");
  });

  it("disables autoDownload", () => {
    expect(mockAutoUpdater.autoDownload).toBe(false);
  });

  it("enables autoInstallOnAppQuit", () => {
    expect(mockAutoUpdater.autoInstallOnAppQuit).toBe(true);
  });

  it("returns initial state with current version", async () => {
    const handler = getHandler("updater:get-state");
    expect(handler).toBeDefined();
    const state = await handler!();
    expect(state).toMatchObject({
      status: "idle",
      currentVersion: "1.0.0",
      version: null,
      error: null,
    });
  });

  it("broadcasts checking status", () => {
    mockAutoUpdater._emit("checking-for-update");
    expect(mockSend).toHaveBeenCalledWith(
      "updater:state-changed",
      expect.objectContaining({ status: "checking" }),
    );
  });

  it("broadcasts update-available with version", () => {
    mockAutoUpdater._emit("update-available", {
      version: "2.0.0",
      releaseDate: "2026-02-21",
    });
    expect(mockSend).toHaveBeenCalledWith(
      "updater:state-changed",
      expect.objectContaining({
        status: "available",
        version: "2.0.0",
        releaseDate: "2026-02-21",
      }),
    );
  });

  it("broadcasts update-not-available", () => {
    mockAutoUpdater._emit("update-not-available");
    expect(mockSend).toHaveBeenCalledWith(
      "updater:state-changed",
      expect.objectContaining({ status: "not-available" }),
    );
  });

  it("broadcasts download progress", () => {
    mockAutoUpdater._emit("download-progress", {
      percent: 42.5,
      bytesPerSecond: 1024000,
      transferred: 5000000,
      total: 12000000,
    });
    expect(mockSend).toHaveBeenCalledWith(
      "updater:state-changed",
      expect.objectContaining({
        status: "downloading",
        downloadProgress: 42.5,
        bytesPerSecond: 1024000,
        transferred: 5000000,
        total: 12000000,
      }),
    );
  });

  it("broadcasts ready status when update downloaded", () => {
    mockAutoUpdater._emit("update-downloaded");
    expect(mockSend).toHaveBeenCalledWith(
      "updater:state-changed",
      expect.objectContaining({
        status: "ready",
        downloadProgress: 100,
      }),
    );
  });

  it("broadcasts error with message", () => {
    mockAutoUpdater._emit("error", new Error("Network failure"));
    expect(mockSend).toHaveBeenCalledWith(
      "updater:state-changed",
      expect.objectContaining({
        status: "error",
        error: "Network failure",
      }),
    );
  });

  it("check handler calls autoUpdater.checkForUpdates", async () => {
    const handler = getHandler("updater:check");
    expect(handler).toBeDefined();
    await handler!();
    expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled();
  });

  it("download handler calls autoUpdater.downloadUpdate", async () => {
    const handler = getHandler("updater:download");
    expect(handler).toBeDefined();
    await handler!();
    expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled();
  });

  it("install handler calls quitAndInstall", () => {
    const handler = getHandler("updater:install");
    expect(handler).toBeDefined();
    handler!();
    expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it("does not auto-check in dev mode (app.isPackaged is false)", () => {
    // In dev mode, checkForUpdates should NOT be called automatically
    // It should only be called via the IPC handler
    expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });
});
