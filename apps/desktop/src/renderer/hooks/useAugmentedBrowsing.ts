import { useEffect } from "react";
import { useAugmentedStore } from "../stores/augmented";

/**
 * Hook that listens for augmented browsing events from the main process.
 * Updates the augmented store with related items for each tab.
 */
export function useAugmentedBrowsing(): void {
  const setRelatedItems = useAugmentedStore((s) => s.setRelatedItems);

  useEffect(() => {
    const unsubscribe = window.electronAPI.augmented.onRelatedItems((data) => {
      setRelatedItems(data.tabId, data.relatedItems);
    });

    return unsubscribe;
  }, [setRelatedItems]);
}
