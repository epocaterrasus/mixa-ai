import { create } from "zustand";
import type { ThemeMode } from "@mixa-ai/types";
import { accentToLight } from "@mixa-ai/ui";

const STORAGE_KEY = "mixa-theme";

interface PersistedTheme {
  mode: ThemeMode;
  accentColor: string;
}

function loadPersisted(): PersistedTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "mode" in parsed &&
        "accentColor" in parsed
      ) {
        const obj = parsed as Record<string, unknown>;
        const mode = obj["mode"];
        const accent = obj["accentColor"];
        if (
          (mode === "dark" || mode === "light" || mode === "system") &&
          typeof accent === "string" &&
          /^#[0-9a-fA-F]{6}$/.test(accent)
        ) {
          return { mode, accentColor: accent };
        }
      }
    }
  } catch {
    // ignore
  }
  return { mode: "dark", accentColor: "#6366f1" };
}

function persist(state: PersistedTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/** Resolve "system" to actual dark/light based on OS preference */
function resolveSystemTheme(): "dark" | "light" {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "dark";
}

export interface ThemeState {
  /** User-selected mode: dark | light | system */
  mode: ThemeMode;
  /** Resolved mode (never "system") */
  resolvedMode: "dark" | "light";
  /** User-selected accent color hex */
  accentColor: string;
  /** Set theme mode */
  setMode: (mode: ThemeMode) => void;
  /** Set accent color */
  setAccentColor: (hex: string) => void;
  /** Called when OS color scheme changes (only relevant in "system" mode) */
  handleSystemChange: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = loadPersisted();
  const resolvedMode =
    initial.mode === "system" ? resolveSystemTheme() : initial.mode;

  return {
    mode: initial.mode,
    resolvedMode,
    accentColor: initial.accentColor,

    setMode: (mode) => {
      const resolved = mode === "system" ? resolveSystemTheme() : mode;
      set({ mode, resolvedMode: resolved });
      persist({ mode, accentColor: get().accentColor });
      applyThemeToDocument(resolved, get().accentColor);
    },

    setAccentColor: (hex) => {
      set({ accentColor: hex });
      persist({ mode: get().mode, accentColor: hex });
      applyAccentToDocument(hex);
    },

    handleSystemChange: () => {
      const { mode } = get();
      if (mode === "system") {
        const resolved = resolveSystemTheme();
        set({ resolvedMode: resolved });
        applyThemeToDocument(resolved, get().accentColor);
      }
    },
  };
});

/** Apply theme mode to the document root element */
function applyThemeToDocument(
  resolved: "dark" | "light",
  accentColor: string,
): void {
  document.documentElement.setAttribute("data-theme", resolved);
  applyAccentToDocument(accentColor);
}

/** Apply accent color CSS variables to the document */
function applyAccentToDocument(hex: string): void {
  document.documentElement.style.setProperty("--mixa-accent-primary", hex);
  document.documentElement.style.setProperty(
    "--mixa-accent-light",
    accentToLight(hex),
  );
}

/** Initialize theme on app startup — call once from main.tsx */
export function initializeTheme(): void {
  const { resolvedMode, accentColor, handleSystemChange } =
    useThemeStore.getState();
  applyThemeToDocument(resolvedMode, accentColor);

  // Listen for OS color scheme changes
  if (typeof window !== "undefined" && window.matchMedia) {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", handleSystemChange);
  }
}
