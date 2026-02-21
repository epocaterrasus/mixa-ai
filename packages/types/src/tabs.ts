// @mixa-ai/types — Tab system types

/** Type discriminator for tabs */
export type TabType =
  | "web"
  | "terminal"
  | "knowledge"
  | "chat"
  | "dashboard"
  | "settings";

/** Loading state of a tab */
export type TabState = "idle" | "loading" | "complete" | "error";

/** A single tab in the browser */
export interface Tab {
  id: string;
  type: TabType;
  title: string;
  url: string | null;
  faviconUrl: string | null;
  isActive: boolean;
  state: TabState;
  spaceId: string | null;
  canGoBack: boolean;
  canGoForward: boolean;
  createdAt: string;
}

/** A named group of tabs (like Arc browser spaces) */
export interface Space {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
}
