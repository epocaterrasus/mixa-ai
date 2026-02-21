import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted ensures these are available during mock factory execution
const { mockHandle, mockGetGrpcClient } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockGetGrpcClient: vi.fn(),
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: mockHandle,
  },
}));

vi.mock("../engine/index.js", () => ({
  engineLifecycle: {
    getGrpcClient: (...args: unknown[]) => mockGetGrpcClient(...args),
  },
  convertViewUpdate: (data: unknown) => data,
}));

import { setupTerminalHandlers, cleanupTerminalStreams } from "./handler.js";

// Helper to create a mock gRPC stream
function createMockStream(): {
  stream: { on: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> };
  listeners: Map<string, (data: unknown) => void>;
} {
  const listeners = new Map<string, (data: unknown) => void>();
  const stream = {
    on: vi.fn((event: string, callback: (data: unknown) => void) => {
      listeners.set(event, callback);
    }),
    cancel: vi.fn(),
  };
  return { stream, listeners };
}

// Get the registered IPC handler by channel name
function getHandler(channel: string): ((...args: unknown[]) => unknown) | undefined {
  for (const call of mockHandle.mock.calls) {
    if (call[0] === channel) {
      return call[1] as (...args: unknown[]) => unknown;
    }
  }
  return undefined;
}

describe("Terminal Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandle.mockClear();
    setupTerminalHandlers();
  });

  afterEach(() => {
    cleanupTerminalStreams();
  });

  it("registers three IPC handlers", () => {
    expect(mockHandle).toHaveBeenCalledTimes(3);
    expect(mockHandle.mock.calls[0]![0]).toBe("terminal:start-stream");
    expect(mockHandle.mock.calls[1]![0]).toBe("terminal:stop-stream");
    expect(mockHandle.mock.calls[2]![0]).toBe("terminal:send-event");
  });

  describe("terminal:start-stream", () => {
    it("sends error when engine is not connected", () => {
      mockGetGrpcClient.mockReturnValue(null);
      const mockSender = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) };
      const handler = getHandler("terminal:start-stream");
      expect(handler).toBeDefined();

      handler!({ sender: mockSender }, { streamId: "tab-1", module: "guard" });

      expect(mockSender.send).toHaveBeenCalledWith("terminal:stream-update", {
        streamId: "tab-1",
        view: null,
        error: "Engine not connected",
        ended: true,
      });
    });

    it("starts a gRPC stream when engine is connected", () => {
      const { stream } = createMockStream();
      const mockClient = {
        streamUI: vi.fn().mockReturnValue(stream),
      };
      mockGetGrpcClient.mockReturnValue(mockClient);

      const mockSender = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) };
      const handler = getHandler("terminal:start-stream");

      handler!({ sender: mockSender }, { streamId: "tab-1", module: "guard" });

      expect(mockClient.streamUI).toHaveBeenCalledWith("guard");
      expect(stream.on).toHaveBeenCalledWith("data", expect.any(Function));
      expect(stream.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(stream.on).toHaveBeenCalledWith("end", expect.any(Function));
    });

    it("forwards view updates to renderer", () => {
      const { stream, listeners } = createMockStream();
      const mockClient = { streamUI: vi.fn().mockReturnValue(stream) };
      mockGetGrpcClient.mockReturnValue(mockClient);

      const mockSender = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) };
      const handler = getHandler("terminal:start-stream");

      handler!({ sender: mockSender }, { streamId: "tab-1", module: "guard" });

      // Simulate a data event from gRPC
      const viewUpdate = {
        module: "guard",
        components: [{ id: "c1", type: "header", content: "GUARD" }],
        actions: [],
      };
      listeners.get("data")!(viewUpdate);

      expect(mockSender.send).toHaveBeenCalledWith("terminal:stream-update", {
        streamId: "tab-1",
        view: viewUpdate,
        error: null,
        ended: false,
      });
    });

    it("handles stream errors", () => {
      const { stream, listeners } = createMockStream();
      const mockClient = { streamUI: vi.fn().mockReturnValue(stream) };
      mockGetGrpcClient.mockReturnValue(mockClient);

      const mockSender = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) };
      const handler = getHandler("terminal:start-stream");

      handler!({ sender: mockSender }, { streamId: "tab-1", module: "guard" });

      // Simulate an error
      listeners.get("error")!(new Error("Connection lost"));

      expect(mockSender.send).toHaveBeenCalledWith("terminal:stream-update", {
        streamId: "tab-1",
        view: null,
        error: "Connection lost",
        ended: true,
      });
    });

    it("handles stream end", () => {
      const { stream, listeners } = createMockStream();
      const mockClient = { streamUI: vi.fn().mockReturnValue(stream) };
      mockGetGrpcClient.mockReturnValue(mockClient);

      const mockSender = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) };
      const handler = getHandler("terminal:start-stream");

      handler!({ sender: mockSender }, { streamId: "tab-1", module: "guard" });

      // Simulate stream end
      listeners.get("end")!(undefined);

      expect(mockSender.send).toHaveBeenCalledWith("terminal:stream-update", {
        streamId: "tab-1",
        view: null,
        error: null,
        ended: true,
      });
    });

    it("cancels existing stream before starting new one", () => {
      const { stream: stream1 } = createMockStream();
      const { stream: stream2 } = createMockStream();
      const mockClient = {
        streamUI: vi.fn()
          .mockReturnValueOnce(stream1)
          .mockReturnValueOnce(stream2),
      };
      mockGetGrpcClient.mockReturnValue(mockClient);

      const mockSender = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) };
      const handler = getHandler("terminal:start-stream");

      // Start first stream
      handler!({ sender: mockSender }, { streamId: "tab-1", module: "guard" });
      // Start second stream with same tab ID — should cancel first
      handler!({ sender: mockSender }, { streamId: "tab-1", module: "forge" });

      expect(stream1.cancel).toHaveBeenCalled();
      expect(mockClient.streamUI).toHaveBeenCalledTimes(2);
    });
  });

  describe("terminal:stop-stream", () => {
    it("cancels an active stream", () => {
      const { stream } = createMockStream();
      const mockClient = { streamUI: vi.fn().mockReturnValue(stream) };
      mockGetGrpcClient.mockReturnValue(mockClient);

      const startHandler = getHandler("terminal:start-stream");
      const stopHandler = getHandler("terminal:stop-stream");
      const mockSender = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) };

      // Start then stop
      startHandler!({ sender: mockSender }, { streamId: "tab-1", module: "guard" });
      stopHandler!({}, { streamId: "tab-1" });

      expect(stream.cancel).toHaveBeenCalled();
    });

    it("does nothing for unknown stream ID", () => {
      const stopHandler = getHandler("terminal:stop-stream");
      // Should not throw
      expect(() => {
        stopHandler!({}, { streamId: "nonexistent" });
      }).not.toThrow();
    });
  });

  describe("terminal:send-event", () => {
    it("sends event to engine via gRPC", async () => {
      const mockClient = {
        sendEvent: vi.fn().mockResolvedValue(true),
      };
      mockGetGrpcClient.mockReturnValue(mockClient);

      const sendHandler = getHandler("terminal:send-event");
      const result = await sendHandler!({}, {
        streamId: "tab-1",
        module: "guard",
        actionId: "add-secret",
        componentId: null,
        eventType: "click",
        data: {},
      });

      expect(result).toBe(true);
      expect(mockClient.sendEvent).toHaveBeenCalledWith({
        module: "guard",
        actionId: "add-secret",
        componentId: undefined,
        eventType: "click",
        data: {},
      });
    });

    it("throws when engine is not connected", async () => {
      mockGetGrpcClient.mockReturnValue(null);
      const sendHandler = getHandler("terminal:send-event");

      await expect(
        sendHandler!({}, {
          streamId: "tab-1",
          module: "guard",
          actionId: null,
          componentId: null,
          eventType: "click",
          data: {},
        }),
      ).rejects.toThrow("Engine not connected");
    });
  });

  describe("cleanupTerminalStreams", () => {
    it("cancels all active streams", () => {
      const { stream: stream1 } = createMockStream();
      const { stream: stream2 } = createMockStream();
      const mockClient = {
        streamUI: vi.fn()
          .mockReturnValueOnce(stream1)
          .mockReturnValueOnce(stream2),
      };
      mockGetGrpcClient.mockReturnValue(mockClient);

      const handler = getHandler("terminal:start-stream");
      const mockSender = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) };

      handler!({ sender: mockSender }, { streamId: "tab-1", module: "guard" });
      handler!({ sender: mockSender }, { streamId: "tab-2", module: "forge" });

      cleanupTerminalStreams();

      expect(stream1.cancel).toHaveBeenCalled();
      expect(stream2.cancel).toHaveBeenCalled();
    });
  });
});
