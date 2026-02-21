// Terminal IPC handler — manages gRPC UI streams between engine and renderer
// Each terminal tab gets its own gRPC stream identified by streamId (= tabId)

import { ipcMain, type WebContents } from "electron";
import type { ClientReadableStream } from "@grpc/grpc-js";
import type { UIView } from "@mixa-ai/types";
import { engineLifecycle, convertViewUpdate } from "../engine/index.js";

/** Active gRPC stream tracked per tab */
interface ActiveStream {
  stream: ClientReadableStream<unknown>;
  module: string;
}

/** Map of streamId (tabId) → active gRPC stream */
const activeStreams = new Map<string, ActiveStream>();

/** IPC payload for terminal stream updates pushed to renderer */
export interface TerminalStreamUpdate {
  streamId: string;
  view: UIView | null;
  error: string | null;
  ended: boolean;
}

/** IPC payload for terminal event requests from renderer */
interface TerminalEventRequest {
  streamId: string;
  module: string;
  actionId: string | null;
  componentId: string | null;
  eventType: string;
  data: Record<string, string>;
}

/** IPC payload for starting a terminal stream */
interface TerminalStartRequest {
  streamId: string;
  module: string;
}

function startStream(sender: WebContents, streamId: string, module: string): void {
  // Cancel any existing stream for this tab
  stopStream(streamId);

  const grpcClient = engineLifecycle.getGrpcClient();
  if (!grpcClient) {
    sender.send("terminal:stream-update", {
      streamId,
      view: null,
      error: "Engine not connected",
      ended: true,
    } satisfies TerminalStreamUpdate);
    return;
  }

  let stream: ClientReadableStream<unknown>;
  try {
    stream = grpcClient.streamUI(module);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sender.send("terminal:stream-update", {
      streamId,
      view: null,
      error: message,
      ended: true,
    } satisfies TerminalStreamUpdate);
    return;
  }

  activeStreams.set(streamId, { stream, module });

  stream.on("data", (data: unknown) => {
    if (sender.isDestroyed()) {
      stopStream(streamId);
      return;
    }

    const view = convertViewUpdate(data as { module: string; components: never[]; actions: never[] });
    sender.send("terminal:stream-update", {
      streamId,
      view,
      error: null,
      ended: false,
    } satisfies TerminalStreamUpdate);
  });

  stream.on("error", (err: Error) => {
    activeStreams.delete(streamId);
    if (!sender.isDestroyed()) {
      sender.send("terminal:stream-update", {
        streamId,
        view: null,
        error: err.message,
        ended: true,
      } satisfies TerminalStreamUpdate);
    }
  });

  stream.on("end", () => {
    activeStreams.delete(streamId);
    if (!sender.isDestroyed()) {
      sender.send("terminal:stream-update", {
        streamId,
        view: null,
        error: null,
        ended: true,
      } satisfies TerminalStreamUpdate);
    }
  });
}

function stopStream(streamId: string): void {
  const active = activeStreams.get(streamId);
  if (active) {
    active.stream.cancel();
    activeStreams.delete(streamId);
  }
}

export function setupTerminalHandlers(): void {
  // Start a gRPC UI stream for a terminal tab
  ipcMain.handle(
    "terminal:start-stream",
    (event, data: TerminalStartRequest): void => {
      startStream(event.sender, data.streamId, data.module);
    },
  );

  // Stop a gRPC UI stream when a terminal tab is closed
  ipcMain.handle(
    "terminal:stop-stream",
    (_event, data: { streamId: string }): void => {
      stopStream(data.streamId);
    },
  );

  // Send a user interaction event to the engine
  ipcMain.handle(
    "terminal:send-event",
    async (_event, data: TerminalEventRequest): Promise<boolean> => {
      const grpcClient = engineLifecycle.getGrpcClient();
      if (!grpcClient) {
        throw new Error("Engine not connected");
      }

      return grpcClient.sendEvent({
        module: data.module,
        actionId: data.actionId ?? undefined,
        componentId: data.componentId ?? undefined,
        eventType: data.eventType,
        data: data.data,
      });
    },
  );
}

/** Clean up all active streams (called during app shutdown) */
export function cleanupTerminalStreams(): void {
  for (const [streamId] of activeStreams) {
    stopStream(streamId);
  }
}
