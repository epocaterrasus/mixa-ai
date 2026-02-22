import { create } from "zustand";
import type { MeetSessionInfo, AudioTabInfo, MeetControlAction } from "@mixa-ai/types";

interface MediaBarState {
  /** Whether the media bar is collapsed */
  isCollapsed: boolean;
  /** Active Google Meet sessions */
  meetSessions: MeetSessionInfo[];
  /** Tabs currently playing audio (excluding Meet tabs) */
  audioTabs: AudioTabInfo[];

  // Actions
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
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
