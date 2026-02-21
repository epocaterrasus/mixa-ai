// Hook to subscribe to auto-updater IPC events from main process

import { useEffect } from "react";
import { useUpdaterStore } from "../stores/updater";

export function useUpdater(): void {
  const updateState = useUpdaterStore((s) => s.updateState);

  useEffect(() => {
    // Load initial state
    void window.electronAPI.updater.getState().then(updateState);

    // Subscribe to state changes from main process
    const unsubscribe = window.electronAPI.updater.onStateChanged(updateState);

    return () => {
      unsubscribe();
    };
  }, [updateState]);
}
