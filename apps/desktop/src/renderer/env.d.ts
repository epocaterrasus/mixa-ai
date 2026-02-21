/// <reference types="vite/client" />

interface ElectronTabsAPI {
  readonly createWebView: (tabId: string, url?: string) => Promise<void>;
  readonly destroyWebView: (tabId: string) => Promise<void>;
  readonly activate: (tabId: string) => Promise<void>;
  readonly navigate: (tabId: string, url: string) => Promise<void>;
  readonly goBack: (tabId: string) => Promise<void>;
  readonly goForward: (tabId: string) => Promise<void>;
  readonly reload: (tabId: string) => Promise<void>;
  readonly hideActiveView: () => Promise<void>;
  readonly showActiveView: () => Promise<void>;

  readonly onLoading: (callback: (data: { tabId: string; loading: boolean }) => void) => () => void;
  readonly onStateChanged: (callback: (data: { tabId: string; state: string; error?: string }) => void) => () => void;
  readonly onTitleUpdated: (callback: (data: { tabId: string; title: string }) => void) => () => void;
  readonly onFaviconUpdated: (callback: (data: { tabId: string; faviconUrl: string | null }) => void) => () => void;
  readonly onUrlUpdated: (callback: (data: { tabId: string; url: string; canGoBack: boolean; canGoForward: boolean }) => void) => () => void;
}

interface ElectronSidebarAPI {
  readonly setWidth: (width: number) => Promise<void>;
}

interface ElectronAPI {
  readonly versions: {
    readonly node: string;
    readonly chrome: string;
    readonly electron: string;
  };
  readonly trpc: (request: {
    path: string;
    input: unknown;
  }) => Promise<
    | { result: { data: unknown } }
    | { error: { code: string; message: string } }
  >;
  readonly tabs: ElectronTabsAPI;
  readonly sidebar: ElectronSidebarAPI;
}

interface Window {
  electronAPI: ElectronAPI;
}
