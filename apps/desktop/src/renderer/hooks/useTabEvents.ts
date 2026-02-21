import { useEffect } from "react";
import type { TabState } from "@mixa-ai/types";
import { useTabStore } from "../stores/tabs";

/**
 * Hook that subscribes to main process tab events and syncs them to the Zustand store.
 * Also manages web view lifecycle: creating/destroying BrowserViews when tabs are added/removed.
 */
export function useTabEvents(): void {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const updateTab = useTabStore((s) => s.updateTab);

  // Subscribe to main process tab events
  useEffect(() => {
    const unsubLoading = window.electronAPI.tabs.onLoading((data) => {
      updateTab(data.tabId, {
        state: data.loading ? "loading" : "complete",
      });
    });

    const unsubState = window.electronAPI.tabs.onStateChanged((data) => {
      updateTab(data.tabId, { state: data.state as TabState });
    });

    const unsubTitle = window.electronAPI.tabs.onTitleUpdated((data) => {
      updateTab(data.tabId, { title: data.title });
    });

    const unsubFavicon = window.electronAPI.tabs.onFaviconUpdated((data) => {
      updateTab(data.tabId, { faviconUrl: data.faviconUrl });
    });

    const unsubUrl = window.electronAPI.tabs.onUrlUpdated((data) => {
      updateTab(data.tabId, {
        url: data.url,
        canGoBack: data.canGoBack,
        canGoForward: data.canGoForward,
      });
    });

    return () => {
      unsubLoading();
      unsubState();
      unsubTitle();
      unsubFavicon();
      unsubUrl();
    };
  }, [updateTab]);

  // When a web tab is activated, tell the main process to show/hide the appropriate BrowserView
  useEffect(() => {
    if (!activeTabId) return;

    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    if (activeTab.type === "web" && activeTab.url) {
      void window.electronAPI.tabs.activate(activeTabId);
    } else {
      // Non-web tab or web tab without URL — hide the BrowserView
      void window.electronAPI.tabs.hideActiveView();
    }
  }, [activeTabId, tabs]);
}
