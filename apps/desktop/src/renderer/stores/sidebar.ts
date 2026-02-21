import { create } from "zustand";

const STORAGE_KEY = "mixa-sidebar-state";
const DEFAULT_WIDTH = 220;
const MIN_WIDTH = 160;
const MAX_WIDTH = 400;
const COLLAPSED_WIDTH = 48;

interface PersistedState {
  isCollapsed: boolean;
  width: number;
}

function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "isCollapsed" in parsed &&
        "width" in parsed &&
        typeof (parsed as PersistedState).isCollapsed === "boolean" &&
        typeof (parsed as PersistedState).width === "number"
      ) {
        return parsed as PersistedState;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { isCollapsed: false, width: DEFAULT_WIDTH };
}

function persistState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore write errors
  }
}

interface SidebarStore {
  isCollapsed: boolean;
  width: number;

  toggle: () => void;
  setWidth: (width: number) => void;
  getEffectiveWidth: () => number;
}

export { MIN_WIDTH, MAX_WIDTH, COLLAPSED_WIDTH };

export const useSidebarStore = create<SidebarStore>((set, get) => {
  const initial = loadPersistedState();

  return {
    isCollapsed: initial.isCollapsed,
    width: initial.width,

    toggle: () => {
      set((state) => {
        const next = { isCollapsed: !state.isCollapsed, width: state.width };
        persistState(next);
        return { isCollapsed: next.isCollapsed };
      });
    },

    setWidth: (width: number) => {
      const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
      set(() => {
        const next = { isCollapsed: get().isCollapsed, width: clamped };
        persistState(next);
        return { width: clamped };
      });
    },

    getEffectiveWidth: () => {
      const { isCollapsed, width } = get();
      return isCollapsed ? COLLAPSED_WIDTH : width;
    },
  };
});
