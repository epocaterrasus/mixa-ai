import { initTRPC, TRPCError } from "@trpc/server";

export interface TRPCContext {
  // Database client will be injected when PGlite is set up (MIXA-046)
  // For now, context is empty — procedures are stubs
}

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export { TRPCError };
