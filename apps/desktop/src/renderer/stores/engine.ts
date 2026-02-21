import { create } from "zustand";
import type { EngineStatusCode, EngineModule } from "@mixa-ai/types";

interface EngineState {
  connected: boolean;
  status: EngineStatusCode;
  modules: EngineModule[];
  uptime: number;
  version: string;
  updateStatus: (data: {
    readonly connected: boolean;
    readonly status: string;
    readonly modules: ReadonlyArray<{
      readonly name: string;
      readonly displayName: string;
      readonly description: string;
      readonly enabled: boolean;
      readonly status: string;
      readonly errorMessage: string | null;
    }>;
    readonly uptime: number;
    readonly version: string;
  }) => void;
}

export const useEngineStore = create<EngineState>((set) => ({
  connected: false,
  status: "stopped",
  modules: [],
  uptime: 0,
  version: "",
  updateStatus: (data) =>
    set({
      connected: data.connected,
      status: data.status as EngineStatusCode,
      modules: data.modules as EngineModule[],
      uptime: data.uptime,
      version: data.version,
    }),
}));
