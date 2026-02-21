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

  // Tab management IPC
  tabs: {
    createWebView: (tabId: string, url?: string): Promise<void> =>
      ipcRenderer.invoke("tab:create-web-view", tabId, url),
    destroyWebView: (tabId: string): Promise<void> =>
      ipcRenderer.invoke("tab:destroy-web-view", tabId),
    activate: (tabId: string): Promise<void> =>
      ipcRenderer.invoke("tab:activate", tabId),
    navigate: (tabId: string, url: string): Promise<void> =>
      ipcRenderer.invoke("tab:navigate", tabId, url),
    goBack: (tabId: string): Promise<void> =>
      ipcRenderer.invoke("tab:go-back", tabId),
    goForward: (tabId: string): Promise<void> =>
      ipcRenderer.invoke("tab:go-forward", tabId),
    reload: (tabId: string): Promise<void> =>
      ipcRenderer.invoke("tab:reload", tabId),
    hideActiveView: (): Promise<void> =>
      ipcRenderer.invoke("tab:hide-active-view"),
    showActiveView: (): Promise<void> =>
      ipcRenderer.invoke("tab:show-active-view"),

    // Event listeners from main → renderer
    onLoading: (callback: (data: { tabId: string; loading: boolean }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { tabId: string; loading: boolean }): void => {
        callback(data);
      };
      ipcRenderer.on("tab:loading", handler);
      return () => ipcRenderer.removeListener("tab:loading", handler);
    },
    onStateChanged: (callback: (data: { tabId: string; state: string; error?: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { tabId: string; state: string; error?: string }): void => {
        callback(data);
      };
      ipcRenderer.on("tab:state-changed", handler);
      return () => ipcRenderer.removeListener("tab:state-changed", handler);
    },
    onTitleUpdated: (callback: (data: { tabId: string; title: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { tabId: string; title: string }): void => {
        callback(data);
      };
      ipcRenderer.on("tab:title-updated", handler);
      return () => ipcRenderer.removeListener("tab:title-updated", handler);
    },
    onFaviconUpdated: (callback: (data: { tabId: string; faviconUrl: string | null }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { tabId: string; faviconUrl: string | null }): void => {
        callback(data);
      };
      ipcRenderer.on("tab:favicon-updated", handler);
      return () => ipcRenderer.removeListener("tab:favicon-updated", handler);
    },
    onUrlUpdated: (callback: (data: { tabId: string; url: string; canGoBack: boolean; canGoForward: boolean }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { tabId: string; url: string; canGoBack: boolean; canGoForward: boolean }): void => {
        callback(data);
      };
      ipcRenderer.on("tab:url-updated", handler);
      return () => ipcRenderer.removeListener("tab:url-updated", handler);
    },
  },

  sidebar: {
    setWidth: (width: number): Promise<void> =>
      ipcRenderer.invoke("sidebar:set-width", width),
  },
} as const;

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
