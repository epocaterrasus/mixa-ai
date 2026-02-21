import {
  type BrowserWindow,
  WebContentsView,
  ipcMain,
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

export class TabManager {
  private views = new Map<string, WebViewInfo>();
  private activeTabId: string | null = null;
  private mainWindow: BrowserWindow | null = null;

  attach(window: BrowserWindow): void {
    this.mainWindow = window;

    window.on("resize", () => {
      this.updateActiveViewBounds();
    });

    this.registerIPC();
  }

  private getContentBounds(): ContentBounds {
    if (!this.mainWindow) {
      return { x: 0, y: CHROME_HEIGHT, width: 800, height: 600 };
    }
    const { width, height } = this.mainWindow.getContentBounds();
    return {
      x: 0,
      y: CHROME_HEIGHT,
      width,
      height: Math.max(0, height - CHROME_HEIGHT),
    };
  }

  createWebView(tabId: string, url?: string): void {
    if (!this.mainWindow) return;
    if (this.views.has(tabId)) return;

    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      },
    });

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

    // Handle new window requests (open in same tab or external browser)
    wc.setWindowOpenHandler(({ url: targetUrl }) => {
      // Navigate the current view instead of opening a new window
      void wc.loadURL(targetUrl);
      return { action: "deny" };
    });

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

  getURL(tabId: string): string | null {
    const info = this.views.get(tabId);
    if (!info || info.view.webContents.isDestroyed()) return null;
    return info.view.webContents.getURL();
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
    ipcMain.handle("tab:create-web-view", (_event, tabId: string, url?: string) => {
      this.createWebView(tabId, url);
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

    ipcMain.handle("tab:hide-active-view", () => {
      this.hideActiveView();
    });

    ipcMain.handle("tab:show-active-view", () => {
      this.showActiveView();
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
    ipcMain.removeHandler("tab:hide-active-view");
    ipcMain.removeHandler("tab:show-active-view");
  }
}

export const tabManager = new TabManager();
