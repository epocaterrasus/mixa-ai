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
    stop: (tabId: string): Promise<void> =>
      ipcRenderer.invoke("tab:stop", tabId),
    findInPage: (tabId: string, text: string, forward: boolean): Promise<void> =>
      ipcRenderer.invoke("tab:find-in-page", tabId, text, forward),
    stopFindInPage: (tabId: string): Promise<void> =>
      ipcRenderer.invoke("tab:stop-find-in-page", tabId),
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
    onNewTabRequest: (callback: (data: { url: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { url: string }): void => {
        callback(data);
      };
      ipcRenderer.on("tab:new-tab-request", handler);
      return () => ipcRenderer.removeListener("tab:new-tab-request", handler);
    },
    onFindResult: (callback: (data: { tabId: string; activeMatchOrdinal: number; matches: number; finalUpdate: boolean }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { tabId: string; activeMatchOrdinal: number; matches: number; finalUpdate: boolean }): void => {
        callback(data);
      };
      ipcRenderer.on("tab:find-result", handler);
      return () => ipcRenderer.removeListener("tab:find-result", handler);
    },
    onDownloadStarted: (callback: (data: { filename: string; totalBytes: number }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { filename: string; totalBytes: number }): void => {
        callback(data);
      };
      ipcRenderer.on("tab:download-started", handler);
      return () => ipcRenderer.removeListener("tab:download-started", handler);
    },
    onDownloadCompleted: (callback: (data: { filename: string; state: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { filename: string; state: string }): void => {
        callback(data);
      };
      ipcRenderer.on("tab:download-completed", handler);
      return () => ipcRenderer.removeListener("tab:download-completed", handler);
    },
  },

  sidebar: {
    setWidth: (width: number): Promise<void> =>
      ipcRenderer.invoke("sidebar:set-width", width),
  },

  // Engine lifecycle events from main → renderer
  engine: {
    onStatusChanged: (callback: (data: {
      connected: boolean;
      status: string;
      modules: Array<{
        name: string;
        displayName: string;
        description: string;
        enabled: boolean;
        status: string;
        errorMessage: string | null;
      }>;
      uptime: number;
      version: string;
    }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: {
        connected: boolean;
        status: string;
        modules: Array<{
          name: string;
          displayName: string;
          description: string;
          enabled: boolean;
          status: string;
          errorMessage: string | null;
        }>;
        uptime: number;
        version: string;
      }): void => {
        callback(data);
      };
      ipcRenderer.on("engine:status-changed", handler);
      return () => ipcRenderer.removeListener("engine:status-changed", handler);
    },
    onLog: (callback: (entry: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, entry: string): void => {
        callback(entry);
      };
      ipcRenderer.on("engine:log", handler);
      return () => ipcRenderer.removeListener("engine:log", handler);
    },
  },
} as const;

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
