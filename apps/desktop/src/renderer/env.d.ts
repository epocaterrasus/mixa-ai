/// <reference types="vite/client" />

interface ElectronTabsAPI {
  readonly createWebView: (tabId: string, url?: string, partitionId?: string) => Promise<void>;
  readonly destroyWebView: (tabId: string) => Promise<void>;
  readonly activate: (tabId: string) => Promise<void>;
  readonly navigate: (tabId: string, url: string) => Promise<void>;
  readonly goBack: (tabId: string) => Promise<void>;
  readonly goForward: (tabId: string) => Promise<void>;
  readonly reload: (tabId: string) => Promise<void>;
  readonly stop: (tabId: string) => Promise<void>;
  readonly findInPage: (tabId: string, text: string, forward: boolean) => Promise<void>;
  readonly stopFindInPage: (tabId: string) => Promise<void>;
  readonly hideActiveView: () => Promise<void>;
  readonly showActiveView: () => Promise<void>;

  readonly onLoading: (callback: (data: { tabId: string; loading: boolean }) => void) => () => void;
  readonly onStateChanged: (callback: (data: { tabId: string; state: string; error?: string }) => void) => () => void;
  readonly onTitleUpdated: (callback: (data: { tabId: string; title: string }) => void) => () => void;
  readonly onFaviconUpdated: (callback: (data: { tabId: string; faviconUrl: string | null }) => void) => () => void;
  readonly onUrlUpdated: (callback: (data: { tabId: string; url: string; canGoBack: boolean; canGoForward: boolean }) => void) => () => void;
  readonly onNewTabRequest: (callback: (data: { url: string }) => void) => () => void;
  readonly onFindResult: (callback: (data: { tabId: string; activeMatchOrdinal: number; matches: number; finalUpdate: boolean }) => void) => () => void;
  readonly onDownloadStarted: (callback: (data: { filename: string; totalBytes: number }) => void) => () => void;
  readonly onDownloadCompleted: (callback: (data: { filename: string; state: string }) => void) => () => void;
}

interface CaptureResultData {
  readonly id: string;
  readonly title: string;
  readonly url: string | null;
  readonly itemType: string;
  readonly domain: string | null;
  readonly wordCount: number | null;
  readonly readingTime: number | null;
}

interface CaptureResponse {
  readonly success: boolean;
  readonly data?: CaptureResultData;
  readonly error?: string;
  readonly isDuplicate?: boolean;
}

interface CaptureCompletedEvent {
  readonly success: boolean;
  readonly data?: CaptureResultData;
  readonly error?: string;
  readonly type: string;
}

interface ElectronCaptureAPI {
  readonly captureTab: (tabId: string, faviconUrl?: string | null) => Promise<CaptureResponse>;
  readonly captureSelection: (tabId: string, selectedText: string, faviconUrl?: string | null) => Promise<CaptureResponse>;
  readonly getSelection: (tabId: string) => Promise<string | null>;
  readonly showContextMenu: (tabId: string, hasSelection: boolean, faviconUrl?: string | null) => Promise<void>;
  readonly onCompleted: (callback: (data: CaptureCompletedEvent) => void) => () => void;
}

interface ElectronSidebarAPI {
  readonly setWidth: (width: number) => Promise<void>;
}

interface EngineStatusData {
  readonly connected: boolean;
  readonly status: string;
  readonly modules: ReadonlyArray<{
    readonly name: string;
    readonly displayName: string;
    readonly description: string;
    readonly enabled: boolean;
    readonly status: string;
    readonly errorMessage: string | null;
  }>;
  readonly uptime: number;
  readonly version: string;
}

interface ElectronEngineAPI {
  readonly onStatusChanged: (callback: (data: EngineStatusData) => void) => () => void;
  readonly onLog: (callback: (entry: string) => void) => () => void;
}

interface ChatStreamChunkData {
  readonly conversationId: string;
  readonly messageId: string;
  readonly content: string;
  readonly done: boolean;
  readonly citations: ReadonlyArray<{
    readonly index: number;
    readonly itemId: string;
    readonly chunkId: string;
    readonly itemTitle: string;
    readonly itemUrl: string | null;
    readonly snippet: string;
  }>;
}

interface ElectronChatAPI {
  readonly sendMessage: (conversationId: string, content: string) => Promise<{
    userMessageId: string;
    assistantMessageId: string;
  }>;
  readonly onStreamChunk: (callback: (data: ChatStreamChunkData) => void) => () => void;
}

interface AugmentedRelatedItemData {
  readonly id: string;
  readonly title: string;
  readonly url: string | null;
  readonly domain: string | null;
  readonly summary: string | null;
  readonly score: number;
  readonly capturedAt: string;
  readonly itemType: string;
  readonly faviconUrl: string | null;
}

interface AugmentedRelatedItemsEvent {
  readonly tabId: string;
  readonly relatedItems: AugmentedRelatedItemData[];
}

interface ElectronAugmentedAPI {
  readonly onRelatedItems: (callback: (data: AugmentedRelatedItemsEvent) => void) => () => void;
}

interface TerminalStreamUpdateData {
  readonly streamId: string;
  readonly view: {
    readonly module: string;
    readonly components: ReadonlyArray<Record<string, unknown>>;
    readonly actions: ReadonlyArray<Record<string, unknown>>;
  } | null;
  readonly error: string | null;
  readonly ended: boolean;
}

interface ElectronTerminalAPI {
  readonly startStream: (streamId: string, module: string) => Promise<void>;
  readonly stopStream: (streamId: string) => Promise<void>;
  readonly sendEvent: (data: {
    streamId: string;
    module: string;
    actionId: string | null;
    componentId: string | null;
    eventType: string;
    data: Record<string, string>;
  }) => Promise<boolean>;
  readonly onStreamUpdate: (callback: (data: TerminalStreamUpdateData) => void) => () => void;
}

interface ElectronShellAPI {
  readonly create: (shellId: string, cols: number, rows: number) => Promise<void>;
  readonly write: (shellId: string, data: string) => Promise<void>;
  readonly resize: (shellId: string, cols: number, rows: number) => Promise<void>;
  readonly destroy: (shellId: string) => Promise<void>;
  readonly onData: (callback: (data: { shellId: string; data: string }) => void) => () => void;
  readonly onExit: (callback: (data: { shellId: string; exitCode: number; signal: number }) => void) => () => void;
}

interface UpdaterStateData {
  readonly status: string;
  readonly version: string | null;
  readonly releaseDate: string | null;
  readonly downloadProgress: number | null;
  readonly bytesPerSecond: number | null;
  readonly transferred: number | null;
  readonly total: number | null;
  readonly error: string | null;
  readonly currentVersion: string;
}

interface ElectronUpdaterAPI {
  readonly getState: () => Promise<UpdaterStateData>;
  readonly checkForUpdates: () => Promise<void>;
  readonly downloadUpdate: () => Promise<void>;
  readonly installUpdate: () => Promise<void>;
  readonly onStateChanged: (callback: (data: UpdaterStateData) => void) => () => void;
}

interface MeetSessionData {
  readonly tabId: string;
  readonly meetingName: string;
  readonly durationSeconds: number;
  readonly participantCount: number;
  readonly isMuted: boolean;
  readonly isCameraOff: boolean;
}

interface AudioTabData {
  readonly tabId: string;
  readonly title: string;
  readonly faviconUrl: string | null;
  readonly url: string | null;
}

interface MediaBarStateData {
  readonly meetSessions: MeetSessionData[];
  readonly audioTabs: AudioTabData[];
}

interface ElectronMediaAPI {
  readonly getState: () => Promise<MediaBarStateData>;
  readonly executeControl: (tabId: string, action: string) => Promise<boolean>;
  readonly setBarHeight: (height: number) => Promise<void>;
  readonly setBarPosition: (position: string) => Promise<void>;
  readonly onStateChanged: (callback: (data: MediaBarStateData) => void) => () => void;
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
  readonly capture: ElectronCaptureAPI;
  readonly sidebar: ElectronSidebarAPI;
  readonly updater: ElectronUpdaterAPI;
  readonly engine: ElectronEngineAPI;
  readonly chat: ElectronChatAPI;
  readonly augmented: ElectronAugmentedAPI;
  readonly terminal: ElectronTerminalAPI;
  readonly shell: ElectronShellAPI;
  readonly media: ElectronMediaAPI;
  readonly canvas: ElectronCanvasAPI;
}

interface CanvasMetaData {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface ElectronCanvasAPI {
  readonly save: (canvasId: string, data: string) => Promise<{ success: boolean; error?: string }>;
  readonly load: (canvasId: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  readonly list: () => Promise<{ success: boolean; canvases?: CanvasMetaData[]; error?: string }>;
  readonly delete: (canvasId: string) => Promise<{ success: boolean; error?: string }>;
  readonly exportFile: (
    defaultName: string,
    format: string,
    data: string,
  ) => Promise<{ success: boolean; filePath?: string; error?: string }>;
}

interface Window {
  electronAPI: ElectronAPI;
}
