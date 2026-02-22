import { initTRPC, TRPCError } from "@trpc/server";
import type { PgliteDbClient } from "@mixa-ai/db";

export interface TRPCContext {
  db: PgliteDbClient;
  userId: string;
}

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export { TRPCError };
