/// <reference types="vite/client" />

interface ElectronAPI {
  readonly versions: {
    readonly node: string;
    readonly chrome: string;
    readonly electron: string;
  };
  readonly trpc: (request: {
    path: string;
    input: unknown;
  }) => Promise<
    | { result: { data: unknown } }
    | { error: { code: string; message: string } }
  >;
}

interface Window {
  electronAPI: ElectronAPI;
}
