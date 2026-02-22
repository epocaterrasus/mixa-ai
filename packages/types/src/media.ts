// @mixa-ai/types — Media bar types

/** Information about an active Google Meet session */
export interface MeetSessionInfo {
  /** Tab ID of the Meet tab */
  tabId: string;
  /** Meeting title or code */
  meetingName: string;
  /** Duration in seconds since join */
  durationSeconds: number;
  /** Number of participants */
  participantCount: number;
  /** Whether the user's microphone is muted */
  isMuted: boolean;
  /** Whether the user's camera is off */
  isCameraOff: boolean;
}

/** Information about a tab that is currently playing audio */
export interface AudioTabInfo {
  /** Tab ID */
  tabId: string;
  /** Tab title */
  title: string;
  /** Tab favicon URL */
  faviconUrl: string | null;
  /** Page URL */
  url: string | null;
}

/** Media bar state sent from main process to renderer */
export interface MediaBarState {
  /** Active Google Meet sessions */
  meetSessions: MeetSessionInfo[];
  /** Tabs currently playing audio */
  audioTabs: AudioTabInfo[];
}

/** Control actions for Google Meet */
export type MeetControlAction = "toggle-mute" | "toggle-camera" | "leave-meeting";
