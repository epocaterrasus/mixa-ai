import { useEffect, useRef } from "react";
import { useTabStore } from "../stores/tabs";

/**
 * Manages the lifecycle of BrowserViews in the main process.
 * When a web or app tab is added to the store, creates a WebContentsView.
 * App tabs use session partitions for isolated cookies/storage.
 * When a tab is removed, destroys the WebContentsView.
 */
export function useTabLifecycle(): void {
  const tabs = useTabStore((s) => s.tabs);
  const prevTabIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(tabs.map((t) => t.id));
    const prevIds = prevTabIdsRef.current;

    // Find newly added web/app tabs (both use WebContentsView)
    for (const tab of tabs) {
      if (!prevIds.has(tab.id) && (tab.type === "web" || tab.type === "app")) {
        void window.electronAPI.tabs.createWebView(
          tab.id,
          tab.url ?? undefined,
          tab.partitionId ?? undefined,
        );
      }
    }

    // Find removed tabs
    for (const prevId of prevIds) {
      if (!currentIds.has(prevId)) {
        void window.electronAPI.tabs.destroyWebView(prevId);
      }
    }

    prevTabIdsRef.current = currentIds;
  }, [tabs]);
}
