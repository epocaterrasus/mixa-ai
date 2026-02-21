import { create } from "zustand";
import type { EngineStatusCode, EngineModule } from "@mixa-ai/types";

interface EngineState {
  connected: boolean;
  status: EngineStatusCode;
  modules: EngineModule[];
  uptime: number;
  version: string;
  updateStatus: (data: {
    connected: boolean;
    status: string;
    modules: Array<{
      name: string;
      displayName: string;
      description: string;
      enabled: boolean;
      status: string;
      errorMessage: string | null;
    }>;
    uptime: number;
    version: string;
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
