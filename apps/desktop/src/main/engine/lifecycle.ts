import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow } from "electron";
import type { EngineStatus, EngineModule, EngineStatusCode } from "@mixa-ai/types";
import { EngineGrpcClient } from "./grpc-client.js";

const MAX_RESTARTS = 3;
const HEALTH_CHECK_INTERVAL_MS = 10_000;
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 5_000;
const MAX_LOG_LINES = 1000;
const GRPC_CONNECT_MAX_RETRIES = 5;

function resolveEngineBinary(): string {
  if (app.isPackaged) {
    const name = process.platform === "win32" ? "fenix.exe" : "fenix";
    return join(process.resourcesPath, "engine", name);
  }

  const root = join(app.getAppPath(), "..", "..");
  const arch = process.arch === "arm64" ? "arm64" : "amd64";
  const platform = process.platform === "darwin" ? "darwin" : "linux";
  const platformBinary = join(root, "engine", "bin", `fenix-${platform}-${arch}`);
  if (existsSync(platformBinary)) {
    return platformBinary;
  }
  return join(root, "engine", "bin", "fenix");
}

function resolveProtoPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "proto", "fenix.proto");
  }
  const root = join(app.getAppPath(), "..", "..");
  return join(root, "engine", "api", "proto", "fenix.proto");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Manages the Go engine process lifecycle from the Electron main process.
 *
 * Responsibilities:
 * - Spawn/stop the Go engine binary as a child process
 * - Establish and manage gRPC client connection with retry logic
 * - Poll health checks every 10 seconds
 * - Auto-restart on crash with exponential backoff (max 3 retries)
 * - Graceful shutdown via SIGTERM (SIGKILL after timeout)
 * - Emit status changes to all renderer windows via IPC
 * - Capture engine stdout/stderr logs
 */
export class EngineLifecycle {
  private childProcess: ChildProcess | null = null;
  private grpcClient: EngineGrpcClient | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private connected = false;
  private engineStatus: EngineStatusCode = "stopped";
  private restartAttempts = 0;
  private engineAddress = "";
  private engineVersion = "";
  private engineUptime = 0;
  private modules: EngineModule[] = [];
  private logs: string[] = [];
  private shuttingDown = false;

  async start(): Promise<void> {
    if (this.engineStatus === "running" || this.engineStatus === "starting") {
      return;
    }

    this.setStatus("starting");
    this.shuttingDown = false;

    const binaryPath = resolveEngineBinary();
    if (!existsSync(binaryPath)) {
      this.addLog(`Engine binary not found at ${binaryPath}. Build it with: cd engine && make build`);
      this.setStatus("stopped");
      return;
    }

    this.addLog(`Starting engine: ${binaryPath}`);

    this.childProcess = spawn(binaryPath, ["-addr", "localhost:0"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    this.childProcess.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        this.addLog(line);

        const match = line.match(/gRPC server listening on (.+)/);
        if (match?.[1]) {
          this.engineAddress = match[1];
          void this.connectGrpc();
        }
      }
    });

    this.childProcess.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        this.addLog(`[stderr] ${line}`);
      }
    });

    this.childProcess.on("exit", (code, signal) => {
      this.addLog(`Engine exited (code=${code ?? "null"}, signal=${signal ?? "null"})`);
      this.disconnectGrpc();
      this.stopHealthCheck();

      if (this.shuttingDown) {
        this.setStatus("stopped");
        return;
      }

      if (this.restartAttempts < MAX_RESTARTS) {
        this.restartAttempts++;
        const backoffMs = Math.pow(2, this.restartAttempts - 1) * 1000;
        this.addLog(`Restarting engine in ${backoffMs}ms (attempt ${this.restartAttempts}/${MAX_RESTARTS})`);
        this.setStatus("error");
        setTimeout(() => void this.start(), backoffMs);
      } else {
        this.addLog(`Max restart attempts (${MAX_RESTARTS}) reached`);
        this.setStatus("error");
      }
    });

    this.childProcess.on("error", (err) => {
      this.addLog(`Engine process error: ${err.message}`);
      this.setStatus("error");
    });
  }

  async stop(): Promise<void> {
    if (this.engineStatus === "stopped") {
      return;
    }

    this.shuttingDown = true;
    this.stopHealthCheck();
    this.disconnectGrpc();

    if (this.childProcess && !this.childProcess.killed) {
      this.addLog("Sending SIGTERM to engine");
      this.childProcess.kill("SIGTERM");

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.childProcess && !this.childProcess.killed) {
            this.addLog("Engine did not exit in time, sending SIGKILL");
            this.childProcess.kill("SIGKILL");
          }
          resolve();
        }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);

        this.childProcess?.once("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    this.childProcess = null;
    this.setStatus("stopped");
  }

  /** Expose the gRPC client for direct access (e.g., UI streaming) */
  getGrpcClient(): EngineGrpcClient | null {
    return this.grpcClient;
  }

  getStatus(): EngineStatus {
    return {
      connected: this.connected,
      status: this.engineStatus,
      modules: this.modules,
      uptime: this.engineUptime,
      version: this.engineVersion,
    };
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  private async connectGrpc(): Promise<void> {
    const protoPath = resolveProtoPath();
    if (!existsSync(protoPath)) {
      this.addLog(`Proto file not found at ${protoPath}`);
      return;
    }

    for (let attempt = 1; attempt <= GRPC_CONNECT_MAX_RETRIES; attempt++) {
      try {
        const client = new EngineGrpcClient();
        await client.connect(this.engineAddress, protoPath);

        const health = await client.healthCheck();
        this.grpcClient = client;
        this.connected = true;
        this.engineVersion = health.version;
        this.engineUptime = health.uptime;
        this.restartAttempts = 0;

        this.addLog(`Connected to engine at ${this.engineAddress} (v${health.version})`);
        this.setStatus("running");
        this.startHealthCheck();

        await this.refreshModules();
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.addLog(`gRPC connect attempt ${attempt}/${GRPC_CONNECT_MAX_RETRIES} failed: ${message}`);
        if (attempt < GRPC_CONNECT_MAX_RETRIES) {
          await delay(attempt * 500);
        }
      }
    }

    this.addLog("Failed to connect to engine after all retries");
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.healthCheckTimer = setInterval(() => {
      void this.performHealthCheck();
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private async performHealthCheck(): Promise<void> {
    if (!this.grpcClient) return;

    try {
      const health = await this.grpcClient.healthCheck();
      this.engineUptime = health.uptime;
      this.engineVersion = health.version;

      if (!this.connected) {
        this.connected = true;
        this.setStatus("running");
      }

      this.emitStatusUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.addLog(`Health check failed: ${message}`);
    }
  }

  private async refreshModules(): Promise<void> {
    if (!this.grpcClient) return;

    try {
      this.modules = await this.grpcClient.listModules();
      this.emitStatusUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.addLog(`Failed to list modules: ${message}`);
    }
  }

  private disconnectGrpc(): void {
    this.connected = false;
    if (this.grpcClient) {
      this.grpcClient.disconnect();
      this.grpcClient = null;
    }
  }

  private setStatus(status: EngineStatusCode): void {
    this.engineStatus = status;
    if (status === "stopped" || status === "error") {
      this.connected = false;
    }
    this.emitStatusUpdate();
  }

  private emitStatusUpdate(): void {
    const status = this.getStatus();
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send("engine:status-changed", status);
    }
  }

  private addLog(message: string): void {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}`;
    this.logs.push(entry);
    if (this.logs.length > MAX_LOG_LINES) {
      this.logs.shift();
    }
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send("engine:log", entry);
    }
  }
}

/** Singleton engine lifecycle manager */
export const engineLifecycle = new EngineLifecycle();
