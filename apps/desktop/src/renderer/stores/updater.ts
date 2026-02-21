// Updater store — tracks auto-update state from main process

import { create } from "zustand";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "ready"
  | "error";

export interface UpdaterState {
  status: UpdateStatus;
  version: string | null;
  releaseDate: string | null;
  downloadProgress: number | null;
  bytesPerSecond: number | null;
  transferred: number | null;
  total: number | null;
  error: string | null;
  currentVersion: string;
  dismissed: boolean;

  updateState: (data: {
    status: string;
    version: string | null;
    releaseDate: string | null;
    downloadProgress: number | null;
    bytesPerSecond: number | null;
    transferred: number | null;
    total: number | null;
    error: string | null;
    currentVersion: string;
  }) => void;
  dismiss: () => void;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

export const useUpdaterStore = create<UpdaterState>((set) => ({
  status: "idle",
  version: null,
  releaseDate: null,
  downloadProgress: null,
  bytesPerSecond: null,
  transferred: null,
  total: null,
  error: null,
  currentVersion: "",
  dismissed: false,

  updateState: (data) => {
    set({
      status: data.status as UpdateStatus,
      version: data.version,
      releaseDate: data.releaseDate,
      downloadProgress: data.downloadProgress,
      bytesPerSecond: data.bytesPerSecond,
      transferred: data.transferred,
      total: data.total,
      error: data.error,
      currentVersion: data.currentVersion,
      // Un-dismiss when a new update becomes available or ready
      ...(data.status === "available" || data.status === "ready"
        ? { dismissed: false }
        : {}),
    });
  },

  dismiss: () => {
    set({ dismissed: true });
  },

  checkForUpdates: async () => {
    await window.electronAPI.updater.checkForUpdates();
  },

  downloadUpdate: async () => {
    await window.electronAPI.updater.downloadUpdate();
  },

  installUpdate: async () => {
    await window.electronAPI.updater.installUpdate();
  },
}));
