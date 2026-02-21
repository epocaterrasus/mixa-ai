import { useEffect } from "react";
import { useTabStore } from "../stores/tabs";

/**
 * Registers global keyboard shortcuts for tab management.
 * - Cmd+T / Ctrl+T: New tab
 * - Cmd+W / Ctrl+W: Close active tab
 * - Cmd+1-9 / Ctrl+1-9: Switch to tab by index (9 = last tab)
 */
export function useTabShortcuts(): void {
  const addTab = useTabStore((s) => s.addTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activateTabByIndex = useTabStore((s) => s.activateTabByIndex);
  const tabs = useTabStore((s) => s.tabs);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const isMod = e.metaKey || e.ctrlKey;
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
  }, [addTab, closeTab, activeTabId, activateTabByIndex, tabs.length]);
}
