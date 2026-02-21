import { z } from "zod";
import type { EngineStatus, EngineModule } from "@mixa-ai/types";
import { router, publicProcedure, TRPCError } from "../trpc.js";

const engineModuleNameSchema = z.enum([
  "guard",
  "forge",
  "ship",
  "know",
  "keys",
  "data",
  "pipe",
  "cost",
  "pulse",
  "play",
  "snap",
  "alert",
  "stats",
  "scout",
  "memory",
]);

const defaultModules: EngineModule[] = [
  {
    name: "guard",
    displayName: "GUARD",
    description: "Secrets & environment management",
    enabled: true,
    status: "stopped",
    errorMessage: null,
  },
  {
    name: "forge",
    displayName: "FORGE",
    description: "Git & GitHub integration",
    enabled: true,
    status: "stopped",
    errorMessage: null,
  },
  {
    name: "keys",
    displayName: "KEYS",
    description: "Keyboard shortcuts & command palette",
    enabled: true,
    status: "stopped",
    errorMessage: null,
  },
  {
    name: "cost",
    displayName: "COST",
    description: "Cloud cost tracking",
    enabled: true,
    status: "stopped",
    errorMessage: null,
  },
  {
    name: "pulse",
    displayName: "PULSE",
    description: "Health & uptime monitoring",
    enabled: true,
    status: "stopped",
    errorMessage: null,
  },
];

export const engineRouter = router({
  status: publicProcedure.query(async (): Promise<EngineStatus> => {
    // TODO: Connect to actual Go engine via gRPC (MIXA-010)
    return {
      connected: false,
      status: "stopped",
      modules: defaultModules,
      uptime: 0,
      version: "0.0.0",
    };
  }),

  listModules: publicProcedure.query(
    async (): Promise<{ modules: EngineModule[] }> => {
      // TODO: Query actual engine modules (MIXA-010)
      return { modules: defaultModules };
    },
  ),

  sendCommand: publicProcedure
    .input(
      z.object({
        module: engineModuleNameSchema,
        action: z.string().min(1),
        params: z.record(z.unknown()).default({}),
      }),
    )
    .mutation(async ({ input }) => {
      // TODO: Forward command to Go engine via gRPC (MIXA-010)
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: `Engine not connected. Cannot send ${input.action} to ${input.module}`,
      });
    }),
});
