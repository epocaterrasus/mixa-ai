import { describe, it, expect, beforeEach, vi } from "vitest";
import { useMediaBarStore } from "./mediaBar";

// Mock window.electronAPI.media
const mockExecuteControl = vi.fn().mockResolvedValue(true);
vi.stubGlobal("window", {
  electronAPI: {
    media: {
      executeControl: mockExecuteControl,
    },
  },
});

// Mock localStorage
const localStorageStore = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => localStorageStore.get(key) ?? null,
  setItem: (key: string, value: string) => localStorageStore.set(key, value),
  removeItem: (key: string) => localStorageStore.delete(key),
});

describe("MediaBar Store", () => {
  beforeEach(() => {
    localStorageStore.clear();
    mockExecuteControl.mockClear();
    useMediaBarStore.setState({
      isCollapsed: false,
      meetSessions: [],
      audioTabs: [],
    });
  });

  describe("initial state", () => {
    it("starts with no meet sessions", () => {
      expect(useMediaBarStore.getState().meetSessions).toEqual([]);
    });

    it("starts with no audio tabs", () => {
      expect(useMediaBarStore.getState().audioTabs).toEqual([]);
    });

    it("starts expanded (not collapsed)", () => {
      expect(useMediaBarStore.getState().isCollapsed).toBe(false);
    });
  });

  describe("toggle", () => {
    it("collapses when expanded", () => {
      useMediaBarStore.getState().toggle();
      expect(useMediaBarStore.getState().isCollapsed).toBe(true);
    });

    it("expands when collapsed", () => {
      useMediaBarStore.setState({ isCollapsed: true });
      useMediaBarStore.getState().toggle();
      expect(useMediaBarStore.getState().isCollapsed).toBe(false);
    });

    it("persists collapsed state to localStorage", () => {
      useMediaBarStore.getState().toggle();
      expect(localStorageStore.get("mixa-media-bar-collapsed")).toBe("true");
    });
  });

  describe("setCollapsed", () => {
    it("sets collapsed to true", () => {
      useMediaBarStore.getState().setCollapsed(true);
      expect(useMediaBarStore.getState().isCollapsed).toBe(true);
    });

    it("sets collapsed to false", () => {
      useMediaBarStore.setState({ isCollapsed: true });
      useMediaBarStore.getState().setCollapsed(false);
      expect(useMediaBarStore.getState().isCollapsed).toBe(false);
    });
  });

  describe("updateMediaState", () => {
    it("updates meet sessions", () => {
      const sessions = [
        {
          tabId: "tab-1",
          meetingName: "Standup",
          durationSeconds: 120,
          participantCount: 5,
          isMuted: false,
          isCameraOff: false,
        },
      ];
      useMediaBarStore.getState().updateMediaState(sessions, []);
      expect(useMediaBarStore.getState().meetSessions).toEqual(sessions);
    });

    it("updates audio tabs", () => {
      const audioTabs = [
        {
          tabId: "tab-2",
          title: "YouTube - Music",
          faviconUrl: null,
          url: "https://youtube.com/watch?v=123",
        },
      ];
      useMediaBarStore.getState().updateMediaState([], audioTabs);
      expect(useMediaBarStore.getState().audioTabs).toEqual(audioTabs);
    });

    it("clears previous state on update", () => {
      useMediaBarStore.setState({
        meetSessions: [
          {
            tabId: "old",
            meetingName: "Old",
            durationSeconds: 0,
            participantCount: 0,
            isMuted: false,
            isCameraOff: false,
          },
        ],
      });
      useMediaBarStore.getState().updateMediaState([], []);
      expect(useMediaBarStore.getState().meetSessions).toEqual([]);
    });
  });

  describe("executeControl", () => {
    it("calls electronAPI.media.executeControl", async () => {
      const result = await useMediaBarStore.getState().executeControl("tab-1", "toggle-mute");
      expect(mockExecuteControl).toHaveBeenCalledWith("tab-1", "toggle-mute");
      expect(result).toBe(true);
    });

    it("returns false on error", async () => {
      mockExecuteControl.mockRejectedValueOnce(new Error("IPC error"));
      const result = await useMediaBarStore.getState().executeControl("tab-1", "toggle-camera");
      expect(result).toBe(false);
    });

    it("supports leave-meeting action", async () => {
      await useMediaBarStore.getState().executeControl("tab-1", "leave-meeting");
      expect(mockExecuteControl).toHaveBeenCalledWith("tab-1", "leave-meeting");
    });
  });
});
