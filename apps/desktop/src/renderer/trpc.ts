import { createTRPCClient, TRPCClientError } from "@trpc/client";
import type { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "../main/trpc/router.js";

const ipcLink: TRPCLink<AppRouter> = () => {
  return ({ op }) => {
    return observable((observer) => {
      const { path, input } = op;

      window.electronAPI
        .trpc({ path, input })
        .then((response) => {
          if ("error" in response) {
            observer.error(
              TRPCClientError.from({
                error: response.error,
                result: undefined,
              }),
            );
          } else {
            observer.next({
              result: { type: "data" as const, data: response.result.data },
            });
            observer.complete();
          }
        })
        .catch((cause: unknown) => {
          observer.error(
            cause instanceof TRPCClientError
              ? cause
              : TRPCClientError.from(
                  cause instanceof Error ? cause : new Error(String(cause)),
                ),
          );
        });
    });
  };
};

export const trpc = createTRPCClient<AppRouter>({
  links: [ipcLink],
});

export type { AppRouter };
