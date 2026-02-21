import { z } from "zod";
import type { EngineStatus, EngineModule } from "@mixa-ai/types";
import { router, publicProcedure, TRPCError } from "../trpc.js";
import { engineLifecycle } from "../../engine/index.js";

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
  status: publicProcedure.query((): EngineStatus => {
    const status = engineLifecycle.getStatus();
    // Use default modules when engine has none registered yet
    if (status.modules.length === 0) {
      return { ...status, modules: defaultModules };
    }
    return status;
  }),

  listModules: publicProcedure.query((): { modules: EngineModule[] } => {
    const status = engineLifecycle.getStatus();
    const modules = status.modules.length > 0 ? status.modules : defaultModules;
    return { modules };
  }),

  logs: publicProcedure.query((): { logs: string[] } => {
    return { logs: engineLifecycle.getLogs() };
  }),

  sendCommand: publicProcedure
    .input(
      z.object({
        module: engineModuleNameSchema,
        action: z.string().min(1),
        params: z.record(z.unknown()).default({}),
      }),
    )
    .mutation(({ input }) => {
      const status = engineLifecycle.getStatus();
      if (!status.connected) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Engine not connected. Cannot send ${input.action} to ${input.module}`,
        });
      }
      // Commands will be forwarded via gRPC in later tasks (MIXA-022+)
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: `Command forwarding not yet implemented for ${input.module}.${input.action}`,
      });
    }),
});
