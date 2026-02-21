import { useEffect } from "react";
import { useTabStore } from "../stores/tabs";
import { useFindBarStore } from "../stores/findBar";

/**
 * Registers global keyboard shortcuts for tab management and navigation.
 * - Cmd+T / Ctrl+T: New tab
 * - Cmd+W / Ctrl+W: Close active tab
 * - Cmd+1-9 / Ctrl+1-9: Switch to tab by index (9 = last tab)
 * - Cmd+[ / Ctrl+[: Go back
 * - Cmd+] / Ctrl+]: Go forward
 * - Cmd+R / Ctrl+R: Reload
 * - Escape: Stop loading
 * - Cmd+F / Ctrl+F: Find in page
 * - Cmd+` / Ctrl+`: Open new shell tab
 */
export function useTabShortcuts(): void {
  const addTab = useTabStore((s) => s.addTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activateTabByIndex = useTabStore((s) => s.activateTabByIndex);
  const tabs = useTabStore((s) => s.tabs);
  const findBarToggle = useFindBarStore((s) => s.toggle);
  const findBarClose = useFindBarStore((s) => s.close);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const isMod = e.metaKey || e.ctrlKey;

      // Escape: Stop loading or close find bar
      if (e.key === "Escape") {
        const findBarOpen = useFindBarStore.getState().isOpen;
        if (findBarOpen) {
          e.preventDefault();
          findBarClose();
          // Also stop the find highlight in the web view
          const currentTabId = useTabStore.getState().activeTabId;
          const currentTab = useTabStore.getState().tabs.find((t) => t.id === currentTabId);
          if (currentTab?.type === "web" && currentTabId) {
            void window.electronAPI.tabs.stopFindInPage(currentTabId);
          }
          return;
        }
        // Stop loading the current web tab
        const currentTabId = useTabStore.getState().activeTabId;
        const currentTab = useTabStore.getState().tabs.find((t) => t.id === currentTabId);
        if (currentTab?.type === "web" && currentTab.state === "loading" && currentTabId) {
          e.preventDefault();
          void window.electronAPI.tabs.stop(currentTabId);
        }
        return;
      }

      if (!isMod) return;

      // Cmd+T: New tab
      if (e.key === "t" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        addTab("web");
        return;
      }

      // Cmd+W: Close active tab
      if (e.key === "w" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
        return;
      }

      // Cmd+[: Go back
      if (e.key === "[" && !e.shiftKey && !e.altKey) {
        const currentTab = useTabStore.getState().tabs.find(
          (t) => t.id === useTabStore.getState().activeTabId,
        );
        if (currentTab?.type === "web" && currentTab.canGoBack) {
          e.preventDefault();
          void window.electronAPI.tabs.goBack(currentTab.id);
        }
        return;
      }

      // Cmd+]: Go forward
      if (e.key === "]" && !e.shiftKey && !e.altKey) {
        const currentTab = useTabStore.getState().tabs.find(
          (t) => t.id === useTabStore.getState().activeTabId,
        );
        if (currentTab?.type === "web" && currentTab.canGoForward) {
          e.preventDefault();
          void window.electronAPI.tabs.goForward(currentTab.id);
        }
        return;
      }

      // Cmd+R: Reload
      if (e.key === "r" && !e.shiftKey && !e.altKey) {
        const currentTabId = useTabStore.getState().activeTabId;
        const currentTab = useTabStore.getState().tabs.find((t) => t.id === currentTabId);
        if (currentTab?.type === "web" && currentTabId) {
          e.preventDefault();
          void window.electronAPI.tabs.reload(currentTabId);
        }
        return;
      }

      // Cmd+F: Find in page
      if (e.key === "f" && !e.shiftKey && !e.altKey) {
        const currentTab = useTabStore.getState().tabs.find(
          (t) => t.id === useTabStore.getState().activeTabId,
        );
        if (currentTab?.type === "web") {
          e.preventDefault();
          findBarToggle();
        }
        return;
      }

      // Cmd+`: Open new shell tab
      if (e.key === "`" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        addTab("terminal", "shell");
        return;
      }

      // Cmd+1-9: Switch to tab by index
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9 && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (num === 9) {
          // Cmd+9 always goes to the last tab
          if (tabs.length > 0) {
            activateTabByIndex(tabs.length - 1);
          }
        } else {
          activateTabByIndex(num - 1);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addTab, closeTab, activeTabId, activateTabByIndex, tabs.length, findBarToggle, findBarClose]);
}
