import { app, BrowserWindow, session, shell } from "electron";
import { join } from "node:path";
import { initDatabase, closeDatabase } from "./db/index.js";
import { setupTRPCHandler } from "./trpc/index.js";
import { tabManager } from "./tabs/manager.js";
import { engineLifecycle } from "./engine/index.js";
import { setupCaptureHandlers } from "./capture/index.js";
import { setupChatHandlers } from "./chat/handler.js";
import { setupTerminalHandlers, cleanupTerminalStreams } from "./terminal/handler.js";
import { setupShellHandlers, cleanupShells } from "./shell/handler.js";
import { augmentedBrowsingService } from "./augmented/index.js";
import { loadSettings } from "./trpc/routers/settings.js";
import { setupUpdater, cleanupUpdater } from "./updater/service.js";
import { setupCanvasHandlers } from "./canvas/handler.js";
import { mediaDetector } from "./media/index.js";

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Mixa",
    show: false,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 10 },
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  tabManager.attach(mainWindow);

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: "bottom" });
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (
    !app.isPackaged &&
    process.env["ELECTRON_RENDERER_URL"] !== undefined
  ) {
    void mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

void app.whenReady().then(async () => {
  // Initialize embedded PGlite database before anything else
  await initDatabase();

  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:",
          ],
        },
      });
    });
  }

  setupTRPCHandler();
  setupCanvasHandlers();
  setupChatHandlers();
  setupTerminalHandlers();
  setupShellHandlers();
  const mainWindow = createWindow();

  setupCaptureHandlers(mainWindow);

  const savedSettings = loadSettings();
  augmentedBrowsingService.setEnabled(savedSettings.augmentedBrowsingEnabled);
  augmentedBrowsingService.attach(mainWindow);
  tabManager.onPageLoaded((tabId) => augmentedBrowsingService.onPageLoaded(tabId));
  tabManager.onTabDestroyed((tabId) => augmentedBrowsingService.onTabDestroyed(tabId));

  mediaDetector.attach(mainWindow);
  const savedMediaEnabled = savedSettings.mediaBar.enabled;
  mediaDetector.setEnabled(savedMediaEnabled);
  tabManager.onPageLoaded((tabId) => mediaDetector.onPageLoaded(tabId));
  tabManager.onTabDestroyed((tabId) => mediaDetector.onTabDestroyed(tabId));

  void engineLifecycle.start();

  setupUpdater(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = createWindow();
      setupCaptureHandlers(newWindow);
      augmentedBrowsingService.attach(newWindow);
    }
  });
});

app.on("before-quit", () => {
  cleanupTerminalStreams();
  cleanupShells();
  cleanupUpdater();
  mediaDetector.destroy();
  void closeDatabase();
  void engineLifecycle.stop();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
