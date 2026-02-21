// @mixa-ai/types — Fenix Go engine types

/** Known engine module names */
export type EngineModuleName =
  | "guard"
  | "forge"
  | "ship"
  | "know"
  | "keys"
  | "data"
  | "pipe"
  | "cost"
  | "pulse"
  | "play"
  | "snap"
  | "alert"
  | "stats"
  | "scout"
  | "memory";

/** Runtime status of a module or the engine itself */
export type EngineStatusCode = "running" | "stopped" | "error" | "starting";

/** Metadata and runtime status of an engine module */
export interface EngineModule {
  name: EngineModuleName;
  displayName: string;
  description: string;
  enabled: boolean;
  status: EngineStatusCode;
  errorMessage: string | null;
}

/** Overall engine status reported to the Electron host */
export interface EngineStatus {
  connected: boolean;
  status: EngineStatusCode;
  modules: EngineModule[];
  uptime: number;
  version: string;
}

/** A command sent from Electron to the engine */
export interface EngineCommand {
  module: EngineModuleName;
  action: string;
  params: Record<string, unknown>;
}

/** An event emitted by the engine to Electron */
export interface EngineEvent {
  module: EngineModuleName;
  eventType: string;
  data: Record<string, unknown>;
  timestamp: string;
}
