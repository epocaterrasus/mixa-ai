import { create } from "zustand";
import type { MeetSessionInfo, AudioTabInfo, MeetControlAction, MediaBarPosition } from "@mixa-ai/types";

interface MediaBarState {
  /** Whether the media bar is collapsed */
  isCollapsed: boolean;
  /** Position of the media bar (top or bottom) */
  position: MediaBarPosition;
  /** Active Google Meet sessions */
  meetSessions: MeetSessionInfo[];
  /** Tabs currently playing audio (excluding Meet tabs) */
  audioTabs: AudioTabInfo[];

  // Actions
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setPosition: (position: MediaBarPosition) => void;
  updateMediaState: (meetSessions: MeetSessionInfo[], audioTabs: AudioTabInfo[]) => void;
  executeControl: (tabId: string, action: MeetControlAction) => Promise<boolean>;
}

const STORAGE_KEY = "mixa-media-bar-collapsed";

function loadCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return stored === "true";
    }
  } catch {
    // Ignore parse errors
  }
  return false;
}

export const useMediaBarStore = create<MediaBarState>((set, get) => ({
  isCollapsed: loadCollapsed(),
  position: "bottom",
  meetSessions: [],
  audioTabs: [],

  toggle: () => {
    const next = !get().isCollapsed;
    set({ isCollapsed: next });
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
  },

  setCollapsed: (isCollapsed) => {
    set({ isCollapsed });
    try { localStorage.setItem(STORAGE_KEY, String(isCollapsed)); } catch { /* ignore */ }
  },

  setPosition: (position) => {
    set({ position });
  },

  updateMediaState: (meetSessions, audioTabs) => {
    set({ meetSessions, audioTabs });
  },

  executeControl: async (tabId, action) => {
    try {
      return await window.electronAPI.media.executeControl(tabId, action);
    } catch {
      return false;
    }
  },
}));
