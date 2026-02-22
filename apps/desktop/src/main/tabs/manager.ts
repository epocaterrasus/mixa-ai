import {
  type BrowserWindow,
  WebContentsView,
  ipcMain,
  session,
  type WebContents,
} from "electron";

interface WebViewInfo {
  view: WebContentsView;
  tabId: string;
}

/** Bounds for web content area below the chrome UI */
interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Height of the browser chrome (tab bar + toolbar)
const CHROME_HEIGHT = 74;

/** Callback invoked when a web tab finishes loading */
export type PageLoadedCallback = (tabId: string) => void;
/** Callback invoked when a web tab is destroyed */
export type TabDestroyedCallback = (tabId: string) => void;

export class TabManager {
  private views = new Map<string, WebViewInfo>();
  private activeTabId: string | null = null;
  private mainWindow: BrowserWindow | null = null;
  private sidebarWidth = 0;
  private mediaBarHeight = 0;
  private configuredSessions = new WeakSet<Electron.Session>();
  private pageLoadedCallbacks: PageLoadedCallback[] = [];
  private tabDestroyedCallbacks: TabDestroyedCallback[] = [];

  attach(window: BrowserWindow): void {
    this.mainWindow = window;

    window.on("resize", () => {
      this.updateActiveViewBounds();
    });

    this.registerIPC();
  }

  /** Register a callback for when a page finishes loading */
  onPageLoaded(callback: PageLoadedCallback): void {
    this.pageLoadedCallbacks.push(callback);
  }

  /** Register a callback for when a tab is destroyed */
  onTabDestroyed(callback: TabDestroyedCallback): void {
    this.tabDestroyedCallbacks.push(callback);
  }

  setSidebarWidth(width: number): void {
    this.sidebarWidth = Math.max(0, Math.round(width));
    this.updateActiveViewBounds();
  }

  setMediaBarHeight(height: number): void {
    this.mediaBarHeight = Math.max(0, Math.round(height));
    this.updateActiveViewBounds();
  }

  private getContentBounds(): ContentBounds {
    if (!this.mainWindow) {
      return { x: this.sidebarWidth, y: CHROME_HEIGHT, width: 800, height: 600 };
    }
    const { width, height } = this.mainWindow.getContentBounds();
    return {
      x: this.sidebarWidth,
      y: CHROME_HEIGHT,
      width: Math.max(0, width - this.sidebarWidth),
      height: Math.max(0, height - CHROME_HEIGHT - this.mediaBarHeight),
    };
  }

  createWebView(tabId: string, url?: string, partitionId?: string): void {
    if (!this.mainWindow) return;
    if (this.views.has(tabId)) return;

    const webPreferences: Electron.WebPreferences = {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    };

    // Use a persistent session partition for app tabs (enables isolated cookies/storage)
    if (partitionId) {
      webPreferences.session = session.fromPartition(`persist:${partitionId}`);
    }

    const view = new WebContentsView({ webPreferences });

    const bounds = this.getContentBounds();
    view.setBounds(bounds);

    // Wire up webContents events to report back to the renderer
    const wc = view.webContents;

    wc.on("did-start-loading", () => {
      this.sendToRenderer("tab:loading", { tabId, loading: true });
    });

    wc.on("did-stop-loading", () => {
      this.sendToRenderer("tab:loading", { tabId, loading: false });
    });

    wc.on("did-finish-load", () => {
      this.sendToRenderer("tab:state-changed", { tabId, state: "complete" as const });
      // Notify augmented browsing and other listeners
      for (const cb of this.pageLoadedCallbacks) {
        cb(tabId);
      }
    });

    wc.on("did-fail-load", (_event, errorCode, errorDescription) => {
      if (errorCode === -3) return; // Aborted navigations (user clicked another link)
      this.sendToRenderer("tab:state-changed", {
        tabId,
        state: "error" as const,
        error: errorDescription,
      });
    });

    wc.on("page-title-updated", (_event, title) => {
      this.sendToRenderer("tab:title-updated", { tabId, title });
    });

    wc.on("page-favicon-updated", (_event, favicons) => {
      const favicon = favicons[0] ?? null;
      this.sendToRenderer("tab:favicon-updated", { tabId, faviconUrl: favicon });
    });

    wc.on("did-navigate", () => {
      this.sendNavigationState(tabId, wc);
    });

    wc.on("did-navigate-in-page", () => {
      this.sendNavigationState(tabId, wc);
    });

    // Handle new window requests — open target=_blank / window.open in a new tab
    wc.setWindowOpenHandler(({ url: targetUrl }) => {
      this.sendToRenderer("tab:new-tab-request", { url: targetUrl });
      return { action: "deny" };
    });

    // Find-in-page result events
    wc.on("found-in-page", (_event, result) => {
      this.sendToRenderer("tab:find-result", {
        tabId,
        activeMatchOrdinal: result.activeMatchOrdinal,
        matches: result.matches,
        finalUpdate: result.finalUpdate,
      });
    });

    // Set up download handler for sessions that haven't been configured yet
    const tabSession = wc.session;
    if (!this.configuredSessions.has(tabSession)) {
      this.configuredSessions.add(tabSession);
      tabSession.on("will-download", (_event, item) => {
        // Electron shows save dialog by default since we don't call setSavePath()
        const filename = item.getFilename();
        this.sendToRenderer("tab:download-started", {
          filename,
          totalBytes: item.getTotalBytes(),
        });

        item.on("done", (_e, state) => {
          this.sendToRenderer("tab:download-completed", { filename, state });
        });
      });
    }

    this.views.set(tabId, { view, tabId });

    if (url) {
      void wc.loadURL(url);
    }
  }

  activateTab(tabId: string): void {
    if (!this.mainWindow) return;

    // Remove the previously active view
    if (this.activeTabId && this.activeTabId !== tabId) {
      const prevInfo = this.views.get(this.activeTabId);
      if (prevInfo) {
        this.mainWindow.contentView.removeChildView(prevInfo.view);
      }
    }

    const info = this.views.get(tabId);
    if (info) {
      // Add the view to the window
      this.mainWindow.contentView.addChildView(info.view);
      this.updateActiveViewBounds();
    }

    this.activeTabId = tabId;
  }

  destroyWebView(tabId: string): void {
    const info = this.views.get(tabId);
    if (!info) return;

    if (this.mainWindow && this.activeTabId === tabId) {
      this.mainWindow.contentView.removeChildView(info.view);
    }

    // Destroy the web contents
    if (!info.view.webContents.isDestroyed()) {
      info.view.webContents.close();
    }

    this.views.delete(tabId);

    if (this.activeTabId === tabId) {
      this.activeTabId = null;
    }

    // Notify listeners that this tab was destroyed
    for (const cb of this.tabDestroyedCallbacks) {
      cb(tabId);
    }
  }

  navigateTo(tabId: string, url: string): void {
    const info = this.views.get(tabId);
    if (!info) return;
    void info.view.webContents.loadURL(url);
  }

  goBack(tabId: string): void {
    const info = this.views.get(tabId);
    if (info?.view.webContents.canGoBack()) {
      info.view.webContents.goBack();
    }
  }

  goForward(tabId: string): void {
    const info = this.views.get(tabId);
    if (info?.view.webContents.canGoForward()) {
      info.view.webContents.goForward();
    }
  }

  reload(tabId: string): void {
    const info = this.views.get(tabId);
    if (info) {
      info.view.webContents.reload();
    }
  }

  stop(tabId: string): void {
    const info = this.views.get(tabId);
    if (info) {
      info.view.webContents.stop();
    }
  }

  findInPage(tabId: string, text: string, forward: boolean): void {
    const info = this.views.get(tabId);
    if (info && text) {
      info.view.webContents.findInPage(text, { forward });
    }
  }

  stopFindInPage(tabId: string): void {
    const info = this.views.get(tabId);
    if (info) {
      info.view.webContents.stopFindInPage("clearSelection");
    }
  }

  getURL(tabId: string): string | null {
    const info = this.views.get(tabId);
    if (!info || info.view.webContents.isDestroyed()) return null;
    return info.view.webContents.getURL();
  }

  /** Extract the full HTML of the page in a web tab */
  async getPageHTML(tabId: string): Promise<string | null> {
    const info = this.views.get(tabId);
    if (!info || info.view.webContents.isDestroyed()) return null;
    const html = await info.view.webContents.executeJavaScript(
      "document.documentElement.outerHTML",
    ) as string;
    return html;
  }

  /** Get the title of the page in a web tab */
  async getPageTitle(tabId: string): Promise<string | null> {
    const info = this.views.get(tabId);
    if (!info || info.view.webContents.isDestroyed()) return null;
    const title = await info.view.webContents.executeJavaScript(
      "document.title || ''",
    ) as string;
    return title || null;
  }

  /** Get the meta description of the page in a web tab */
  async getPageMetaDescription(tabId: string): Promise<string | null> {
    const info = this.views.get(tabId);
    if (!info || info.view.webContents.isDestroyed()) return null;
    const description = await info.view.webContents.executeJavaScript(
      "(document.querySelector('meta[name=\"description\"]')?.content || document.querySelector('meta[property=\"og:description\"]')?.content || '')",
    ) as string;
    return description || null;
  }

  /** Get the currently selected text in a web tab */
  async getSelectedText(tabId: string): Promise<string | null> {
    const info = this.views.get(tabId);
    if (!info || info.view.webContents.isDestroyed()) return null;
    const text = await info.view.webContents.executeJavaScript(
      "window.getSelection()?.toString() ?? ''",
    ) as string;
    return text || null;
  }

  /** Get the webContents title synchronously (without executing JS) */
  getWebContentsTitle(tabId: string): string | null {
    const info = this.views.get(tabId);
    if (!info || info.view.webContents.isDestroyed()) return null;
    return info.view.webContents.getTitle();
  }

  /** Check whether a view exists and its webContents is not destroyed */
  hasActiveView(tabId: string): boolean {
    const info = this.views.get(tabId);
    return !!info && !info.view.webContents.isDestroyed();
  }

  /** Get all tab IDs that currently have an active web view */
  getAllViewIds(): string[] {
    return Array.from(this.views.keys());
  }

  /** Get all active views with their tab IDs */
  getViews(): WebViewInfo[] {
    return Array.from(this.views.values());
  }

  /** Get view info for a specific tab */
  getViewInfo(tabId: string): WebViewInfo | undefined {
    return this.views.get(tabId);
  }

  /** Check if a tab's webContents is currently audible */
  isAudible(tabId: string): boolean {
    const info = this.views.get(tabId);
    if (!info || info.view.webContents.isDestroyed()) return false;
    return info.view.webContents.isCurrentlyAudible();
  }

  /** Execute JavaScript in a tab's webContents and return the result */
  async executeInTab(tabId: string, code: string): Promise<unknown> {
    const info = this.views.get(tabId);
    if (!info || info.view.webContents.isDestroyed()) return null;
    return info.view.webContents.executeJavaScript(code);
  }

  hideActiveView(): void {
    if (!this.mainWindow || !this.activeTabId) return;
    const info = this.views.get(this.activeTabId);
    if (info) {
      this.mainWindow.contentView.removeChildView(info.view);
    }
  }

  showActiveView(): void {
    if (!this.mainWindow || !this.activeTabId) return;
    const info = this.views.get(this.activeTabId);
    if (info) {
      this.mainWindow.contentView.addChildView(info.view);
      this.updateActiveViewBounds();
    }
  }

  private updateActiveViewBounds(): void {
    if (!this.activeTabId) return;
    const info = this.views.get(this.activeTabId);
    if (info) {
      const bounds = this.getContentBounds();
      info.view.setBounds(bounds);
    }
  }

  private sendToRenderer(channel: string, data: unknown): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.webContents.send(channel, data);
  }

  private sendNavigationState(tabId: string, wc: WebContents): void {
    this.sendToRenderer("tab:url-updated", {
      tabId,
      url: wc.getURL(),
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward(),
    });
  }

  private registerIPC(): void {
    ipcMain.handle("tab:create-web-view", (_event, tabId: string, url?: string, partitionId?: string) => {
      this.createWebView(tabId, url, partitionId);
    });

    ipcMain.handle("tab:destroy-web-view", (_event, tabId: string) => {
      this.destroyWebView(tabId);
    });

    ipcMain.handle("tab:activate", (_event, tabId: string) => {
      this.activateTab(tabId);
    });

    ipcMain.handle("tab:navigate", (_event, tabId: string, url: string) => {
      this.navigateTo(tabId, url);
    });

    ipcMain.handle("tab:go-back", (_event, tabId: string) => {
      this.goBack(tabId);
    });

    ipcMain.handle("tab:go-forward", (_event, tabId: string) => {
      this.goForward(tabId);
    });

    ipcMain.handle("tab:reload", (_event, tabId: string) => {
      this.reload(tabId);
    });

    ipcMain.handle("tab:stop", (_event, tabId: string) => {
      this.stop(tabId);
    });

    ipcMain.handle("tab:find-in-page", (_event, tabId: string, text: string, forward: boolean) => {
      this.findInPage(tabId, text, forward);
    });

    ipcMain.handle("tab:stop-find-in-page", (_event, tabId: string) => {
      this.stopFindInPage(tabId);
    });

    ipcMain.handle("tab:hide-active-view", () => {
      this.hideActiveView();
    });

    ipcMain.handle("tab:show-active-view", () => {
      this.showActiveView();
    });

    ipcMain.handle("sidebar:set-width", (_event, width: number) => {
      this.setSidebarWidth(width);
    });
  }

  destroy(): void {
    for (const [tabId] of this.views) {
      this.destroyWebView(tabId);
    }

    ipcMain.removeHandler("tab:create-web-view");
    ipcMain.removeHandler("tab:destroy-web-view");
    ipcMain.removeHandler("tab:activate");
    ipcMain.removeHandler("tab:navigate");
    ipcMain.removeHandler("tab:go-back");
    ipcMain.removeHandler("tab:go-forward");
    ipcMain.removeHandler("tab:reload");
    ipcMain.removeHandler("tab:stop");
    ipcMain.removeHandler("tab:find-in-page");
    ipcMain.removeHandler("tab:stop-find-in-page");
    ipcMain.removeHandler("tab:hide-active-view");
    ipcMain.removeHandler("tab:show-active-view");
    ipcMain.removeHandler("sidebar:set-width");
  }
}

export const tabManager = new TabManager();
