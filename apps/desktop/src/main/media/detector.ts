import { type BrowserWindow, ipcMain } from "electron";
import type { MediaBarState, MeetSessionInfo, AudioTabInfo, MeetControlAction } from "@mixa-ai/types";
import { tabManager } from "../tabs/manager.js";
import {
  MEET_EXTRACT_INFO_SCRIPT,
  MEET_TOGGLE_MUTE_SCRIPT,
  MEET_TOGGLE_CAMERA_SCRIPT,
  MEET_LEAVE_SCRIPT,
} from "./meet-scripts.js";

/** Checks whether a URL is a Google Meet meeting page */
function isMeetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "meet.google.com" && parsed.pathname.length > 1;
  } catch {
    return false;
  }
}

/**
 * MediaDetector service.
 * Monitors tabs for Google Meet sessions and audible media.
 * Sends state updates to the renderer via IPC.
 */
export class MediaDetector {
  private mainWindow: BrowserWindow | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  /** Meet tab IDs mapped to their join timestamp */
  private meetTabs = new Map<string, number>();
  private enabled = true;

  /** Polling interval in ms */
  private static readonly POLL_MS = 3000;

  attach(window: BrowserWindow): void {
    this.mainWindow = window;
    this.registerIPC();
    this.startPolling();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.meetTabs.clear();
      this.sendState({ meetSessions: [], audioTabs: [] });
    }
  }

  /** Called when a tab finishes loading — check if it's a Meet tab */
  onPageLoaded(tabId: string): void {
    if (!this.enabled) return;
    const url = tabManager.getURL(tabId);
    if (url && isMeetUrl(url)) {
      if (!this.meetTabs.has(tabId)) {
        this.meetTabs.set(tabId, Date.now());
        void this.pushState();
      }
    }
  }

  /** Called when a tab is destroyed */
  onTabDestroyed(tabId: string): void {
    const had = this.meetTabs.delete(tabId);
    if (had) {
      void this.pushState();
    }
  }

  private startPolling(): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => {
      void this.pollMediaState();
    }, MediaDetector.POLL_MS);
  }

  private async pollMediaState(): Promise<void> {
    if (!this.enabled || !this.mainWindow || this.mainWindow.isDestroyed()) return;

    // Check all tracked Meet tabs — remove ones that navigated away
    for (const tabId of [...this.meetTabs.keys()]) {
      if (!tabManager.hasActiveView(tabId)) {
        this.meetTabs.delete(tabId);
        continue;
      }
      const url = tabManager.getURL(tabId);
      if (!url || !isMeetUrl(url)) {
        this.meetTabs.delete(tabId);
      }
    }

    // Scan all views for new Meet tabs
    const allViewIds = tabManager.getAllViewIds();
    for (const tabId of allViewIds) {
      if (!tabManager.hasActiveView(tabId)) continue;
      const url = tabManager.getURL(tabId);
      if (url && isMeetUrl(url) && !this.meetTabs.has(tabId)) {
        this.meetTabs.set(tabId, Date.now());
      }
    }

    // Always push state to keep durations and audible tabs up to date
    await this.pushState();
  }

  private async pushState(): Promise<void> {
    const state = await this.buildState();
    this.sendState(state);
  }

  private async buildState(): Promise<MediaBarState> {
    const meetSessions: MeetSessionInfo[] = [];

    for (const [tabId, joinTime] of this.meetTabs) {
      if (!tabManager.hasActiveView(tabId)) continue;

      try {
        const rawResult = await tabManager.executeInTab(tabId, MEET_EXTRACT_INFO_SCRIPT) as string | null;
        if (rawResult) {
          const info = JSON.parse(rawResult) as {
            meetingName: string;
            participantCount: number;
            isMuted: boolean;
            isCameraOff: boolean;
          };

          meetSessions.push({
            tabId,
            meetingName: info.meetingName,
            durationSeconds: Math.floor((Date.now() - joinTime) / 1000),
            participantCount: info.participantCount,
            isMuted: info.isMuted,
            isCameraOff: info.isCameraOff,
          });
        }
      } catch {
        // Tab may have been destroyed between check and script execution
      }
    }

    // Collect audible tabs (excluding active Meet tabs to avoid duplicates)
    const audioTabs: AudioTabInfo[] = [];
    const allViewIds = tabManager.getAllViewIds();
    for (const tabId of allViewIds) {
      if (tabManager.isAudible(tabId) && !this.meetTabs.has(tabId)) {
        audioTabs.push({
          tabId,
          title: tabManager.getWebContentsTitle(tabId) ?? "Playing audio",
          faviconUrl: null, // Favicon tracked in renderer store
          url: tabManager.getURL(tabId),
        });
      }
    }

    return { meetSessions, audioTabs };
  }

  private async handleMeetControl(
    tabId: string,
    action: MeetControlAction,
  ): Promise<boolean> {
    if (!tabManager.hasActiveView(tabId)) return false;

    let script: string;
    switch (action) {
      case "toggle-mute":
        script = MEET_TOGGLE_MUTE_SCRIPT;
        break;
      case "toggle-camera":
        script = MEET_TOGGLE_CAMERA_SCRIPT;
        break;
      case "leave-meeting":
        script = MEET_LEAVE_SCRIPT;
        break;
      default:
        return false;
    }

    try {
      await tabManager.executeInTab(tabId, script);
      // Push updated state after a short delay for the DOM to update
      setTimeout(() => {
        void this.pushState();
      }, 500);
      return true;
    } catch {
      return false;
    }
  }

  private sendState(state: MediaBarState): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.webContents.send("media:state-changed", state);
  }

  private registerIPC(): void {
    ipcMain.handle(
      "media:execute-control",
      (_event, tabId: string, action: string) => {
        return this.handleMeetControl(tabId, action as MeetControlAction);
      },
    );

    ipcMain.handle("media:get-state", () => {
      return this.buildState();
    });

    ipcMain.handle("media:set-bar-height", (_event, height: number) => {
      tabManager.setMediaBarHeight(height);
    });

    ipcMain.handle("media:set-bar-position", (_event, position: string) => {
      tabManager.setMediaBarPosition(position as "top" | "bottom");
    });
  }

  destroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.meetTabs.clear();
    this.mainWindow = null;

    ipcMain.removeHandler("media:execute-control");
    ipcMain.removeHandler("media:get-state");
    ipcMain.removeHandler("media:set-bar-height");
    ipcMain.removeHandler("media:set-bar-position");
  }
}

export const mediaDetector = new MediaDetector();
