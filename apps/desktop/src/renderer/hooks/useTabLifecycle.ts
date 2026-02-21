import { useEffect, useRef } from "react";
import { useTabStore } from "../stores/tabs";

/**
 * Manages the lifecycle of BrowserViews in the main process.
 * When a web tab is added to the store with a URL, creates a BrowserView.
 * When a web tab is removed, destroys the BrowserView.
 */
export function useTabLifecycle(): void {
  const tabs = useTabStore((s) => s.tabs);
  const prevTabIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(tabs.map((t) => t.id));
    const prevIds = prevTabIdsRef.current;

    // Find newly added web tabs
    for (const tab of tabs) {
      if (!prevIds.has(tab.id) && tab.type === "web") {
        void window.electronAPI.tabs.createWebView(tab.id, tab.url ?? undefined);
      }
    }

    // Find removed tabs that were web tabs
    for (const prevId of prevIds) {
      if (!currentIds.has(prevId)) {
        void window.electronAPI.tabs.destroyWebView(prevId);
      }
    }

    prevTabIdsRef.current = currentIds;
  }, [tabs]);
}
