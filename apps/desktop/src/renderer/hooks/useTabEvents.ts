import { useEffect } from "react";
import type { TabState } from "@mixa-ai/types";
import { useTabStore } from "../stores/tabs";
import { useHistoryStore } from "../stores/history";
import { useFindBarStore } from "../stores/findBar";

/**
 * Hook that subscribes to main process tab events and syncs them to the Zustand store.
 * Also records browsing history, handles new tab requests, download events,
 * and find-in-page results.
 */
export function useTabEvents(): void {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const updateTab = useTabStore((s) => s.updateTab);
  const addTab = useTabStore((s) => s.addTab);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);
  const setFindResult = useFindBarStore((s) => s.setResult);

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
      // Record history when title updates (we have both URL and title at this point)
      const tab = useTabStore.getState().tabs.find((t) => t.id === data.tabId);
      if (tab?.url) {
        addHistoryEntry(tab.url, data.title, tab.faviconUrl);
      }
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

    // Handle target=_blank / window.open → create a new tab
    const unsubNewTab = window.electronAPI.tabs.onNewTabRequest((data) => {
      addTab("web", data.url);
    });

    // Find-in-page result events
    const unsubFindResult = window.electronAPI.tabs.onFindResult((data) => {
      if (data.finalUpdate) {
        setFindResult(data.activeMatchOrdinal, data.matches);
      }
    });

    return () => {
      unsubLoading();
      unsubState();
      unsubTitle();
      unsubFavicon();
      unsubUrl();
      unsubNewTab();
      unsubFindResult();
    };
  }, [updateTab, addTab, addHistoryEntry, setFindResult]);

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
