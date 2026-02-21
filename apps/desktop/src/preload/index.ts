import { contextBridge } from "electron";

const electronAPI = {
  versions: {
    node: process.versions["node"] ?? "",
    chrome: process.versions["chrome"] ?? "",
    electron: process.versions["electron"] ?? "",
  },
} as const;

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
