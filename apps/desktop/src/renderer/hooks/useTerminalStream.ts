// Hook to subscribe to terminal gRPC stream updates for a specific tab/module

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIView, UIEvent } from "@mixa-ai/types";

export type TerminalStreamState = "idle" | "connecting" | "streaming" | "error" | "disconnected";

interface UseTerminalStreamResult {
  view: UIView | null;
  state: TerminalStreamState;
  error: string | null;
  sendEvent: (event: UIEvent) => void;
  reconnect: () => void;
}

export function useTerminalStream(
  streamId: string,
  module: string | null,
): UseTerminalStreamResult {
  const [view, setView] = useState<UIView | null>(null);
  const [state, setState] = useState<TerminalStreamState>("idle");
  const [error, setError] = useState<string | null>(null);
  const currentModuleRef = useRef<string | null>(null);

  const startStream = useCallback(() => {
    if (!module) {
      setState("idle");
      return;
    }

    setState("connecting");
    setError(null);
    setView(null);
    currentModuleRef.current = module;

    void window.electronAPI.terminal.startStream(streamId, module);
  }, [streamId, module]);

  const stopStream = useCallback(() => {
    void window.electronAPI.terminal.stopStream(streamId);
  }, [streamId]);

  // Subscribe to stream updates
  useEffect(() => {
    const unsubscribe = window.electronAPI.terminal.onStreamUpdate((data) => {
      if (data.streamId !== streamId) return;

      if (data.error) {
        setError(data.error);
        setState("error");
        return;
      }

      if (data.ended) {
        setState("disconnected");
        return;
      }

      if (data.view) {
        setView(data.view as UIView);
        setState("streaming");
      }
    });

    return unsubscribe;
  }, [streamId]);

  // Start stream when module changes
  useEffect(() => {
    if (!module) {
      setState("idle");
      setView(null);
      return;
    }

    startStream();

    return () => {
      stopStream();
    };
  }, [module, startStream, stopStream]);

  const sendEvent = useCallback(
    (event: UIEvent) => {
      if (!module) return;

      void window.electronAPI.terminal.sendEvent({
        streamId,
        module: event.module,
        actionId: event.actionId,
        componentId: event.componentId,
        eventType: event.eventType,
        data: event.data,
      });
    },
    [streamId, module],
  );

  const reconnect = useCallback(() => {
    startStream();
  }, [startStream]);

  return { view, state, error, sendEvent, reconnect };
}
