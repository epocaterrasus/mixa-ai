import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  versions: {
    node: process.versions["node"] ?? "",
    chrome: process.versions["chrome"] ?? "",
    electron: process.versions["electron"] ?? "",
  },
  trpc: (request: {
    path: string;
    input: unknown;
  }): Promise<
    | { result: { data: unknown } }
    | { error: { code: string; message: string } }
  > => ipcRenderer.invoke("trpc", request),
} as const;

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
