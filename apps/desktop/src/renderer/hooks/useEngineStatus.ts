import { useEffect } from "react";
import { useEngineStore } from "../stores/engine";

/**
 * Hook that subscribes to engine status events from the main process
 * and syncs them to the Zustand engine store.
 */
export function useEngineStatus(): void {
  const updateStatus = useEngineStore((s) => s.updateStatus);

  useEffect(() => {
    const unsubStatus = window.electronAPI.engine.onStatusChanged((data) => {
      updateStatus(data);
    });

    return () => {
      unsubStatus();
    };
  }, [updateStatus]);
}
