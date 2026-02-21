// @mixa-ai/types — Tab system types

/** Type discriminator for tabs */
export type TabType =
  | "web"
  | "app"
  | "terminal"
  | "knowledge"
  | "chat"
  | "dashboard"
  | "settings";

/** Loading state of a tab */
export type TabState = "idle" | "loading" | "complete" | "error";

/** Partition strategy for app tabs */
export type AppPartitionStrategy = "per-instance" | "shared";

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
  /** Session partition ID for app tabs (enables isolated cookies/storage) */
  partitionId: string | null;
  /** App template ID if this tab was created from a template */
  appTemplateId: string | null;
}

/** A named group of tabs (like Arc browser spaces) */
export interface Space {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
}

/** Template for a popular web app */
export interface AppTemplate {
  id: string;
  name: string;
  url: string;
  icon: string;
  /** Partition strategy: per-instance creates a unique partition per tab, shared uses the same partition */
  partitionStrategy: AppPartitionStrategy;
}
