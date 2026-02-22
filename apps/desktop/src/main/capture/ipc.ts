import {
  ipcMain,
  Menu,
  type BrowserWindow,
  type MenuItemConstructorOptions,
} from "electron";
import {
  captureTab,
  captureSelection,
  type CaptureResult,
} from "./service.js";
import { tabManager } from "../tabs/manager.js";

interface CaptureResponse {
  success: boolean;
  data?: CaptureResult;
  error?: string;
  isDuplicate?: boolean;
}

function sendToRenderer(window: BrowserWindow, channel: string, data: unknown): void {
  if (!window.isDestroyed()) {
    window.webContents.send(channel, data);
  }
}

export function setupCaptureHandlers(mainWindow: BrowserWindow): void {
  // Handle full page capture from renderer
  ipcMain.handle(
    "capture:tab",
    async (
      _event,
      tabId: string,
      faviconUrl?: string | null,
    ): Promise<CaptureResponse> => {
      try {
        const result = await captureTab(tabId, faviconUrl);
        return { success: true, data: result };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Capture failed";
        return { success: false, error: message };
      }
    },
  );

  // Handle text selection capture from renderer
  ipcMain.handle(
    "capture:selection",
    async (
      _event,
      tabId: string,
      selectedText: string,
      faviconUrl?: string | null,
    ): Promise<CaptureResponse> => {
      try {
        const result = await captureSelection(tabId, selectedText, faviconUrl);
        return { success: true, data: result };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Capture failed";
        return { success: false, error: message };
      }
    },
  );

  // Handle getting selected text from a web tab
  ipcMain.handle(
    "capture:get-selection",
    async (_event, tabId: string): Promise<string | null> => {
      return tabManager.getSelectedText(tabId);
    },
  );

  // Set up context menu for web tabs with "Save to Mixa" option
  setupContextMenu(mainWindow);
}

function setupContextMenu(mainWindow: BrowserWindow): void {
  // Listen for context-menu events from the main window's renderer
  // The renderer will send context menu requests for web tabs
  ipcMain.handle(
    "capture:show-context-menu",
    async (
      _event,
      tabId: string,
      hasSelection: boolean,
      faviconUrl?: string | null,
    ): Promise<void> => {
      const menuItems: MenuItemConstructorOptions[] = [];

      if (hasSelection) {
        menuItems.push({
          label: "Save Selection to Mixa",
          click: () => {
            void (async () => {
              const selectedText = await tabManager.getSelectedText(tabId);
              if (!selectedText) return;

              try {
                const result = await captureSelection(tabId, selectedText, faviconUrl);
                sendToRenderer(mainWindow, "capture:completed", {
                  success: true,
                  data: result,
                  type: "selection",
                });
              } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Capture failed";
                sendToRenderer(mainWindow, "capture:completed", {
                  success: false,
                  error: message,
                  type: "selection",
                });
              }
            })();
          },
        });
      }

      menuItems.push({
        label: "Save Page to Mixa",
        click: () => {
          void (async () => {
            try {
              const result = await captureTab(tabId, faviconUrl);
              sendToRenderer(mainWindow, "capture:completed", {
                success: true,
                data: result,
                type: "page",
              });
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : "Capture failed";
              sendToRenderer(mainWindow, "capture:completed", {
                success: false,
                error: message,
                type: "page",
              });
            }
          })();
        },
      });

      const menu = Menu.buildFromTemplate(menuItems);
      menu.popup({ window: mainWindow });
    },
  );
}

export function cleanupCaptureHandlers(): void {
  ipcMain.removeHandler("capture:tab");
  ipcMain.removeHandler("capture:selection");
  ipcMain.removeHandler("capture:get-selection");
  ipcMain.removeHandler("capture:show-context-menu");
}
