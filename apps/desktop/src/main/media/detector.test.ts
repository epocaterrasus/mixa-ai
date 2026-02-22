import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Hoist mock variables so they're available in vi.mock factories
const { mockHandle, mockRemoveHandler, mockSend } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockRemoveHandler: vi.fn(),
  mockSend: vi.fn(),
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: mockHandle,
    removeHandler: mockRemoveHandler,
  },
}));

// Mock tabManager
vi.mock("../tabs/manager.js", () => ({
  tabManager: {
    getURL: vi.fn(),
    hasActiveView: vi.fn(),
    getAllViewIds: vi.fn(() => []),
    executeInTab: vi.fn(),
    isAudible: vi.fn(),
    getWebContentsTitle: vi.fn(),
    setMediaBarHeight: vi.fn(),
    setMediaBarPosition: vi.fn(),
  },
}));

// Mock meet scripts
vi.mock("./meet-scripts.js", () => ({
  MEET_EXTRACT_INFO_SCRIPT: "MOCK_EXTRACT_SCRIPT",
  MEET_TOGGLE_MUTE_SCRIPT: "MOCK_TOGGLE_MUTE",
  MEET_TOGGLE_CAMERA_SCRIPT: "MOCK_TOGGLE_CAMERA",
  MEET_LEAVE_SCRIPT: "MOCK_LEAVE",
}));

import { MediaDetector } from "./detector.js";
import { tabManager } from "../tabs/manager.js";

// ---- Helper: inline copy of isMeetUrl for direct testing ----
function isMeetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "meet.google.com" && parsed.pathname.length > 1;
  } catch {
    return false;
  }
}

// ---- Tests ----

describe("isMeetUrl", () => {
  it("returns true for a standard Meet URL", () => {
    expect(isMeetUrl("https://meet.google.com/abc-defg-hij")).toBe(true);
  });

  it("returns true for Meet URL with query params", () => {
    expect(isMeetUrl("https://meet.google.com/abc-defg-hij?authuser=0")).toBe(true);
  });

  it("returns false for Meet homepage", () => {
    expect(isMeetUrl("https://meet.google.com/")).toBe(false);
  });

  it("returns false for non-Meet Google URLs", () => {
    expect(isMeetUrl("https://www.google.com/")).toBe(false);
    expect(isMeetUrl("https://mail.google.com/")).toBe(false);
    expect(isMeetUrl("https://docs.google.com/")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(isMeetUrl("not a url")).toBe(false);
    expect(isMeetUrl("")).toBe(false);
  });

  it("returns false for other domains with meet in the name", () => {
    expect(isMeetUrl("https://meet.example.com/room")).toBe(false);
    expect(isMeetUrl("https://zoom.us/meeting")).toBe(false);
  });

  it("returns true for Meet URL with path segments", () => {
    expect(isMeetUrl("https://meet.google.com/new")).toBe(true);
    expect(isMeetUrl("https://meet.google.com/lookup/abc")).toBe(true);
  });
});

describe("MediaDetector", () => {
  let detector: MediaDetector;
  let mockWindow: { webContents: { send: ReturnType<typeof vi.fn> }; isDestroyed: ReturnType<typeof vi.fn> };

  /** Extract a registered IPC handler by channel name */
  function getHandler(channel: string): ((...args: unknown[]) => unknown) | undefined {
    const call = mockHandle.mock.calls.find(
      (c: unknown[]) => c[0] === channel,
    );
    return call ? (call[1] as (...args: unknown[]) => unknown) : undefined;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockWindow = {
      webContents: { send: mockSend },
      isDestroyed: vi.fn(() => false),
    };

    detector = new MediaDetector();
    detector.attach(mockWindow as unknown as Electron.BrowserWindow);
  });

  afterEach(() => {
    detector.destroy();
    vi.useRealTimers();
  });

  it("registers IPC handlers on attach", () => {
    const channels = mockHandle.mock.calls.map((c: unknown[]) => c[0]);
    expect(channels).toContain("media:execute-control");
    expect(channels).toContain("media:get-state");
    expect(channels).toContain("media:set-bar-height");
    expect(channels).toContain("media:set-bar-position");
  });

  it("removes IPC handlers on destroy", () => {
    detector.destroy();
    const channels = mockRemoveHandler.mock.calls.map((c: unknown[]) => c[0]);
    expect(channels).toContain("media:execute-control");
    expect(channels).toContain("media:get-state");
    expect(channels).toContain("media:set-bar-height");
    expect(channels).toContain("media:set-bar-position");
  });

  describe("onPageLoaded", () => {
    it("tracks a new Meet tab", async () => {
      vi.mocked(tabManager.getURL).mockReturnValue("https://meet.google.com/abc-defg-hij");
      vi.mocked(tabManager.hasActiveView).mockReturnValue(true);
      vi.mocked(tabManager.getAllViewIds).mockReturnValue(["tab-1"]);
      vi.mocked(tabManager.executeInTab).mockResolvedValue(
        JSON.stringify({
          meetingName: "Standup",
          participantCount: 3,
          isMuted: false,
          isCameraOff: false,
        }),
      );

      detector.onPageLoaded("tab-1");

      // pushState is async — advance a small amount to flush promises
      await vi.advanceTimersByTimeAsync(100);

      expect(mockSend).toHaveBeenCalledWith(
        "media:state-changed",
        expect.objectContaining({
          meetSessions: expect.arrayContaining([
            expect.objectContaining({ tabId: "tab-1", meetingName: "Standup" }),
          ]),
        }),
      );
    });

    it("ignores non-Meet URLs", async () => {
      vi.mocked(tabManager.getURL).mockReturnValue("https://www.google.com/search?q=test");
      vi.mocked(tabManager.getAllViewIds).mockReturnValue(["tab-1"]);

      detector.onPageLoaded("tab-1");
      await vi.advanceTimersByTimeAsync(100);

      // No state push for a non-meet page load (only polling triggers)
      // The initial onPageLoaded should not add the tab, so no immediate push
      expect(mockSend).not.toHaveBeenCalledWith(
        "media:state-changed",
        expect.objectContaining({
          meetSessions: expect.arrayContaining([
            expect.objectContaining({ tabId: "tab-1" }),
          ]),
        }),
      );
    });

    it("does not track when disabled", async () => {
      detector.setEnabled(false);
      vi.mocked(tabManager.getURL).mockReturnValue("https://meet.google.com/abc-defg-hij");

      detector.onPageLoaded("tab-1");
      await vi.advanceTimersByTimeAsync(100);

      // setEnabled(false) sends an empty state once
      const calls = mockSend.mock.calls.filter(
        (c: unknown[]) => c[0] === "media:state-changed",
      );
      // All calls should have empty meetSessions
      for (const call of calls) {
        const state = call[1] as { meetSessions: unknown[] };
        expect(state.meetSessions).toHaveLength(0);
      }
    });
  });

  describe("onTabDestroyed", () => {
    it("removes a tracked Meet tab and pushes state", async () => {
      // First, add a Meet tab
      vi.mocked(tabManager.getURL).mockReturnValue("https://meet.google.com/abc-defg-hij");
      vi.mocked(tabManager.hasActiveView).mockReturnValue(true);
      vi.mocked(tabManager.getAllViewIds).mockReturnValue(["tab-1"]);
      vi.mocked(tabManager.executeInTab).mockResolvedValue(
        JSON.stringify({
          meetingName: "Standup",
          participantCount: 3,
          isMuted: false,
          isCameraOff: false,
        }),
      );

      detector.onPageLoaded("tab-1");
      await vi.advanceTimersByTimeAsync(100);
      mockSend.mockClear();

      // Destroy the tab
      vi.mocked(tabManager.hasActiveView).mockReturnValue(false);
      vi.mocked(tabManager.getAllViewIds).mockReturnValue([]);
      detector.onTabDestroyed("tab-1");
      await vi.advanceTimersByTimeAsync(100);

      expect(mockSend).toHaveBeenCalledWith(
        "media:state-changed",
        expect.objectContaining({
          meetSessions: [],
        }),
      );
    });

    it("does not push state for non-tracked tabs", async () => {
      detector.onTabDestroyed("unknown-tab");
      await vi.advanceTimersByTimeAsync(100);

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe("polling", () => {
    it("polls every 3 seconds", async () => {
      vi.mocked(tabManager.getAllViewIds).mockReturnValue([]);

      // Advance by 3 seconds to trigger first poll
      await vi.advanceTimersByTimeAsync(3000);

      expect(mockSend).toHaveBeenCalledWith(
        "media:state-changed",
        expect.objectContaining({
          meetSessions: [],
          audioTabs: [],
        }),
      );
    });

    it("detects new Meet tabs during polling", async () => {
      vi.mocked(tabManager.getAllViewIds).mockReturnValue(["tab-1"]);
      vi.mocked(tabManager.hasActiveView).mockReturnValue(true);
      vi.mocked(tabManager.getURL).mockReturnValue("https://meet.google.com/xyz-abcd-efg");
      vi.mocked(tabManager.executeInTab).mockResolvedValue(
        JSON.stringify({
          meetingName: "Sprint Planning",
          participantCount: 5,
          isMuted: true,
          isCameraOff: false,
        }),
      );

      await vi.advanceTimersByTimeAsync(3000);

      expect(mockSend).toHaveBeenCalledWith(
        "media:state-changed",
        expect.objectContaining({
          meetSessions: expect.arrayContaining([
            expect.objectContaining({
              tabId: "tab-1",
              meetingName: "Sprint Planning",
              isMuted: true,
            }),
          ]),
        }),
      );
    });

    it("removes Meet tabs that navigated away", async () => {
      // First poll: tab is on Meet
      vi.mocked(tabManager.getAllViewIds).mockReturnValue(["tab-1"]);
      vi.mocked(tabManager.hasActiveView).mockReturnValue(true);
      vi.mocked(tabManager.getURL).mockReturnValue("https://meet.google.com/abc-defg-hij");
      vi.mocked(tabManager.executeInTab).mockResolvedValue(
        JSON.stringify({
          meetingName: "Meeting",
          participantCount: 2,
          isMuted: false,
          isCameraOff: false,
        }),
      );

      await vi.advanceTimersByTimeAsync(3000);
      mockSend.mockClear();

      // Second poll: tab navigated to non-Meet
      vi.mocked(tabManager.getURL).mockReturnValue("https://www.google.com/");

      await vi.advanceTimersByTimeAsync(3000);

      expect(mockSend).toHaveBeenCalledWith(
        "media:state-changed",
        expect.objectContaining({
          meetSessions: [],
        }),
      );
    });

    it("detects audible non-Meet tabs", async () => {
      vi.mocked(tabManager.getAllViewIds).mockReturnValue(["tab-2"]);
      vi.mocked(tabManager.hasActiveView).mockReturnValue(true);
      vi.mocked(tabManager.getURL).mockReturnValue("https://www.youtube.com/watch?v=123");
      vi.mocked(tabManager.isAudible).mockReturnValue(true);
      vi.mocked(tabManager.getWebContentsTitle).mockReturnValue("Cool Song - YouTube");

      await vi.advanceTimersByTimeAsync(3000);

      expect(mockSend).toHaveBeenCalledWith(
        "media:state-changed",
        expect.objectContaining({
          audioTabs: expect.arrayContaining([
            expect.objectContaining({
              tabId: "tab-2",
              title: "Cool Song - YouTube",
              url: "https://www.youtube.com/watch?v=123",
            }),
          ]),
        }),
      );
    });

    it("excludes Meet tabs from audioTabs", async () => {
      vi.mocked(tabManager.getAllViewIds).mockReturnValue(["tab-1"]);
      vi.mocked(tabManager.hasActiveView).mockReturnValue(true);
      vi.mocked(tabManager.getURL).mockReturnValue("https://meet.google.com/abc-defg-hij");
      vi.mocked(tabManager.isAudible).mockReturnValue(true);
      vi.mocked(tabManager.executeInTab).mockResolvedValue(
        JSON.stringify({
          meetingName: "Meeting",
          participantCount: 2,
          isMuted: false,
          isCameraOff: false,
        }),
      );

      await vi.advanceTimersByTimeAsync(3000);

      const stateCall = mockSend.mock.calls.find(
        (c: unknown[]) => c[0] === "media:state-changed",
      );
      expect(stateCall).toBeDefined();
      const state = stateCall![1] as { meetSessions: unknown[]; audioTabs: unknown[] };
      expect(state.meetSessions).toHaveLength(1);
      expect(state.audioTabs).toHaveLength(0);
    });

    it("does not poll when disabled", async () => {
      detector.setEnabled(false);
      mockSend.mockClear();

      vi.mocked(tabManager.getAllViewIds).mockReturnValue(["tab-1"]);
      vi.mocked(tabManager.getURL).mockReturnValue("https://meet.google.com/abc-defg-hij");

      await vi.advanceTimersByTimeAsync(3000);

      // No state push from polling (only the setEnabled call)
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe("setEnabled", () => {
    it("sends empty state when disabled", () => {
      detector.setEnabled(false);

      expect(mockSend).toHaveBeenCalledWith(
        "media:state-changed",
        { meetSessions: [], audioTabs: [] },
      );
    });

    it("clears tracked Meet tabs when disabled", async () => {
      // Track a Meet tab first
      vi.mocked(tabManager.getURL).mockReturnValue("https://meet.google.com/abc-defg-hij");
      vi.mocked(tabManager.hasActiveView).mockReturnValue(true);
      vi.mocked(tabManager.getAllViewIds).mockReturnValue(["tab-1"]);
      vi.mocked(tabManager.executeInTab).mockResolvedValue(
        JSON.stringify({ meetingName: "M", participantCount: 1, isMuted: false, isCameraOff: false }),
      );
      detector.onPageLoaded("tab-1");
      await vi.advanceTimersByTimeAsync(100);

      // Disable and re-enable
      detector.setEnabled(false);
      mockSend.mockClear();
      detector.setEnabled(true);

      // After re-enable, poll should not find old tabs (they were cleared)
      vi.mocked(tabManager.getAllViewIds).mockReturnValue([]);
      await vi.advanceTimersByTimeAsync(3000);

      const stateCall = mockSend.mock.calls.find(
        (c: unknown[]) => c[0] === "media:state-changed",
      );
      expect(stateCall).toBeDefined();
      const state = stateCall![1] as { meetSessions: unknown[] };
      expect(state.meetSessions).toHaveLength(0);
    });
  });

  describe("IPC: media:get-state", () => {
    it("returns current state", async () => {
      const handler = getHandler("media:get-state");
      expect(handler).toBeDefined();

      vi.mocked(tabManager.getAllViewIds).mockReturnValue([]);
      const result = await handler!();
      expect(result).toEqual({ meetSessions: [], audioTabs: [] });
    });
  });

  describe("IPC: media:execute-control", () => {
    it("executes toggle-mute script", async () => {
      vi.mocked(tabManager.hasActiveView).mockReturnValue(true);
      vi.mocked(tabManager.executeInTab).mockResolvedValue(undefined);

      const handler = getHandler("media:execute-control");
      expect(handler).toBeDefined();

      const result = await handler!({}, "tab-1", "toggle-mute");
      expect(result).toBe(true);
      expect(tabManager.executeInTab).toHaveBeenCalledWith("tab-1", "MOCK_TOGGLE_MUTE");
    });

    it("executes toggle-camera script", async () => {
      vi.mocked(tabManager.hasActiveView).mockReturnValue(true);
      vi.mocked(tabManager.executeInTab).mockResolvedValue(undefined);

      const handler = getHandler("media:execute-control");
      const result = await handler!({}, "tab-1", "toggle-camera");
      expect(result).toBe(true);
      expect(tabManager.executeInTab).toHaveBeenCalledWith("tab-1", "MOCK_TOGGLE_CAMERA");
    });

    it("executes leave-meeting script", async () => {
      vi.mocked(tabManager.hasActiveView).mockReturnValue(true);
      vi.mocked(tabManager.executeInTab).mockResolvedValue(undefined);

      const handler = getHandler("media:execute-control");
      const result = await handler!({}, "tab-1", "leave-meeting");
      expect(result).toBe(true);
      expect(tabManager.executeInTab).toHaveBeenCalledWith("tab-1", "MOCK_LEAVE");
    });

    it("returns false for inactive tab", async () => {
      vi.mocked(tabManager.hasActiveView).mockReturnValue(false);

      const handler = getHandler("media:execute-control");
      const result = await handler!({}, "tab-1", "toggle-mute");
      expect(result).toBe(false);
    });

    it("returns false when executeInTab throws", async () => {
      vi.mocked(tabManager.hasActiveView).mockReturnValue(true);
      vi.mocked(tabManager.executeInTab).mockRejectedValue(new Error("Tab destroyed"));

      const handler = getHandler("media:execute-control");
      const result = await handler!({}, "tab-1", "toggle-mute");
      expect(result).toBe(false);
    });
  });

  describe("IPC: media:set-bar-height", () => {
    it("delegates to tabManager.setMediaBarHeight", () => {
      const handler = getHandler("media:set-bar-height");
      expect(handler).toBeDefined();

      handler!({}, 40);
      expect(tabManager.setMediaBarHeight).toHaveBeenCalledWith(40);
    });
  });

  describe("IPC: media:set-bar-position", () => {
    it("delegates to tabManager.setMediaBarPosition", () => {
      const handler = getHandler("media:set-bar-position");
      expect(handler).toBeDefined();

      handler!({}, "top");
      expect(tabManager.setMediaBarPosition).toHaveBeenCalledWith("top");
    });

    it("handles bottom position", () => {
      const handler = getHandler("media:set-bar-position");
      expect(handler).toBeDefined();

      handler!({}, "bottom");
      expect(tabManager.setMediaBarPosition).toHaveBeenCalledWith("bottom");
    });
  });

  describe("duration tracking", () => {
    it("calculates duration from join time", async () => {
      vi.mocked(tabManager.getURL).mockReturnValue("https://meet.google.com/abc-defg-hij");
      vi.mocked(tabManager.hasActiveView).mockReturnValue(true);
      vi.mocked(tabManager.getAllViewIds).mockReturnValue(["tab-1"]);
      vi.mocked(tabManager.executeInTab).mockResolvedValue(
        JSON.stringify({
          meetingName: "Meeting",
          participantCount: 2,
          isMuted: false,
          isCameraOff: false,
        }),
      );

      // Join the meeting
      detector.onPageLoaded("tab-1");
      await vi.advanceTimersByTimeAsync(100);

      // Advance 30 seconds and poll
      mockSend.mockClear();
      await vi.advanceTimersByTimeAsync(30_000);

      const lastCall = mockSend.mock.calls
        .filter((c: unknown[]) => c[0] === "media:state-changed")
        .pop();
      expect(lastCall).toBeDefined();
      const state = lastCall![1] as { meetSessions: Array<{ durationSeconds: number }> };
      expect(state.meetSessions).toHaveLength(1);
      expect(state.meetSessions[0]!.durationSeconds).toBeGreaterThanOrEqual(30);
    });
  });
});
