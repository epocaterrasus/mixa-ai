import { ipcMain } from "electron";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./router.js";
import { createCallerFactory, type TRPCContext } from "./trpc.js";

const createCaller = createCallerFactory(appRouter);

function createContext(): TRPCContext {
  return {};
}

function resolveProcedure(
  caller: ReturnType<typeof createCaller>,
  path: string,
): (input: unknown) => Promise<unknown> {
  const segments = path.split(".");
  let current: unknown = caller;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Procedure not found: ${path}`,
      });
    }
    current = (current as Record<string, unknown>)[segment];
  }
  if (typeof current !== "function") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Procedure not found: ${path}`,
    });
  }
  return current as (input: unknown) => Promise<unknown>;
}

export function setupTRPCHandler(): void {
  ipcMain.handle(
    "trpc",
    async (
      _event,
      request: { path: string; input: unknown },
    ): Promise<
      | { result: { data: unknown } }
      | { error: { code: string; message: string } }
    > => {
      try {
        const ctx = createContext();
        const caller = createCaller(ctx);
        const procedure = resolveProcedure(caller, request.path);
        const data = await procedure(request.input);
        return { result: { data } };
      } catch (error: unknown) {
        if (error instanceof TRPCError) {
          return {
            error: { code: error.code, message: error.message },
          };
        }
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          error: { code: "INTERNAL_SERVER_ERROR", message },
        };
      }
    },
  );
}
