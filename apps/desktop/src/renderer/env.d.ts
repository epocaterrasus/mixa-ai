/// <reference types="vite/client" />

interface ElectronAPI {
  readonly versions: {
    readonly node: string;
    readonly chrome: string;
    readonly electron: string;
  };
}

interface Window {
  electronAPI: ElectronAPI;
}
