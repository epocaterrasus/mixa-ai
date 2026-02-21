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
    createWebView: (tabId: string, url?: string, partitionId?: string): Promise<void> =>
      ipcRenderer.invoke("tab:create-web-view", tabId, url, partitionId),
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

  // Content capture IPC
  capture: {
    captureTab: (tabId: string, faviconUrl?: string | null): Promise<{
      success: boolean;
      data?: { id: string; title: string; url: string | null; itemType: string; domain: string | null; wordCount: number | null; readingTime: number | null };
      error?: string;
      isDuplicate?: boolean;
    }> => ipcRenderer.invoke("capture:tab", tabId, faviconUrl),

    captureSelection: (tabId: string, selectedText: string, faviconUrl?: string | null): Promise<{
      success: boolean;
      data?: { id: string; title: string; url: string | null; itemType: string; domain: string | null; wordCount: number | null; readingTime: number | null };
      error?: string;
    }> => ipcRenderer.invoke("capture:selection", tabId, selectedText, faviconUrl),

    getSelection: (tabId: string): Promise<string | null> =>
      ipcRenderer.invoke("capture:get-selection", tabId),

    showContextMenu: (tabId: string, hasSelection: boolean, faviconUrl?: string | null): Promise<void> =>
      ipcRenderer.invoke("capture:show-context-menu", tabId, hasSelection, faviconUrl),

    onCompleted: (callback: (data: {
      success: boolean;
      data?: { id: string; title: string; url: string | null; itemType: string; domain: string | null; wordCount: number | null; readingTime: number | null };
      error?: string;
      type: string;
    }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: {
        success: boolean;
        data?: { id: string; title: string; url: string | null; itemType: string; domain: string | null; wordCount: number | null; readingTime: number | null };
        error?: string;
        type: string;
      }): void => {
        callback(data);
      };
      ipcRenderer.on("capture:completed", handler);
      return () => ipcRenderer.removeListener("capture:completed", handler);
    },
  },

  sidebar: {
    setWidth: (width: number): Promise<void> =>
      ipcRenderer.invoke("sidebar:set-width", width),
  },

  // Chat streaming IPC
  chat: {
    sendMessage: (conversationId: string, content: string): Promise<{
      userMessageId: string;
      assistantMessageId: string;
    }> => ipcRenderer.invoke("chat:send-message", { conversationId, content }),

    onStreamChunk: (callback: (data: {
      conversationId: string;
      messageId: string;
      content: string;
      done: boolean;
      citations: Array<{
        index: number;
        itemId: string;
        chunkId: string;
        itemTitle: string;
        itemUrl: string | null;
        snippet: string;
      }>;
    }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: {
        conversationId: string;
        messageId: string;
        content: string;
        done: boolean;
        citations: Array<{
          index: number;
          itemId: string;
          chunkId: string;
          itemTitle: string;
          itemUrl: string | null;
          snippet: string;
        }>;
      }): void => {
        callback(data);
      };
      ipcRenderer.on("chat:stream-chunk", handler);
      return () => ipcRenderer.removeListener("chat:stream-chunk", handler);
    },
  },

  // Augmented browsing IPC (related items indicator)
  augmented: {
    onRelatedItems: (callback: (data: {
      tabId: string;
      relatedItems: Array<{
        id: string;
        title: string;
        url: string | null;
        domain: string | null;
        summary: string | null;
        score: number;
        capturedAt: string;
        itemType: string;
        faviconUrl: string | null;
      }>;
    }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: {
        tabId: string;
        relatedItems: Array<{
          id: string;
          title: string;
          url: string | null;
          domain: string | null;
          summary: string | null;
          score: number;
          capturedAt: string;
          itemType: string;
          faviconUrl: string | null;
        }>;
      }): void => {
        callback(data);
      };
      ipcRenderer.on("augmented:related-items", handler);
      return () => ipcRenderer.removeListener("augmented:related-items", handler);
    },
  },

  // Shell (xterm.js + node-pty) IPC
  shell: {
    create: (shellId: string, cols: number, rows: number): Promise<void> =>
      ipcRenderer.invoke("shell:create", { shellId, cols, rows }),

    write: (shellId: string, data: string): Promise<void> =>
      ipcRenderer.invoke("shell:write", { shellId, data }),

    resize: (shellId: string, cols: number, rows: number): Promise<void> =>
      ipcRenderer.invoke("shell:resize", { shellId, cols, rows }),

    destroy: (shellId: string): Promise<void> =>
      ipcRenderer.invoke("shell:destroy", { shellId }),

    onData: (callback: (data: { shellId: string; data: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { shellId: string; data: string }): void => {
        callback(data);
      };
      ipcRenderer.on("shell:data", handler);
      return () => ipcRenderer.removeListener("shell:data", handler);
    },

    onExit: (callback: (data: { shellId: string; exitCode: number; signal: number }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { shellId: string; exitCode: number; signal: number }): void => {
        callback(data);
      };
      ipcRenderer.on("shell:exit", handler);
      return () => ipcRenderer.removeListener("shell:exit", handler);
    },
  },

  // Terminal gRPC streaming IPC
  terminal: {
    startStream: (streamId: string, module: string): Promise<void> =>
      ipcRenderer.invoke("terminal:start-stream", { streamId, module }),

    stopStream: (streamId: string): Promise<void> =>
      ipcRenderer.invoke("terminal:stop-stream", { streamId }),

    sendEvent: (data: {
      streamId: string;
      module: string;
      actionId: string | null;
      componentId: string | null;
      eventType: string;
      data: Record<string, string>;
    }): Promise<boolean> => ipcRenderer.invoke("terminal:send-event", data),

    onStreamUpdate: (callback: (data: {
      streamId: string;
      view: {
        module: string;
        components: Array<Record<string, unknown>>;
        actions: Array<Record<string, unknown>>;
      } | null;
      error: string | null;
      ended: boolean;
    }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: {
        streamId: string;
        view: {
          module: string;
          components: Array<Record<string, unknown>>;
          actions: Array<Record<string, unknown>>;
        } | null;
        error: string | null;
        ended: boolean;
      }): void => {
        callback(data);
      };
      ipcRenderer.on("terminal:stream-update", handler);
      return () => ipcRenderer.removeListener("terminal:stream-update", handler);
    },
  },

  // Auto-updater IPC
  updater: {
    getState: (): Promise<{
      status: string;
      version: string | null;
      releaseDate: string | null;
      downloadProgress: number | null;
      bytesPerSecond: number | null;
      transferred: number | null;
      total: number | null;
      error: string | null;
      currentVersion: string;
    }> => ipcRenderer.invoke("updater:get-state"),

    checkForUpdates: (): Promise<void> =>
      ipcRenderer.invoke("updater:check"),

    downloadUpdate: (): Promise<void> =>
      ipcRenderer.invoke("updater:download"),

    installUpdate: (): Promise<void> =>
      ipcRenderer.invoke("updater:install"),

    onStateChanged: (callback: (data: {
      status: string;
      version: string | null;
      releaseDate: string | null;
      downloadProgress: number | null;
      bytesPerSecond: number | null;
      transferred: number | null;
      total: number | null;
      error: string | null;
      currentVersion: string;
    }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: {
        status: string;
        version: string | null;
        releaseDate: string | null;
        downloadProgress: number | null;
        bytesPerSecond: number | null;
        transferred: number | null;
        total: number | null;
        error: string | null;
        currentVersion: string;
      }): void => {
        callback(data);
      };
      ipcRenderer.on("updater:state-changed", handler);
      return () => ipcRenderer.removeListener("updater:state-changed", handler);
    },
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
