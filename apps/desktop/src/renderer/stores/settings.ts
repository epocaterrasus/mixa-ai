// Settings store — Zustand state management for user settings

import { create } from "zustand";
import type {
  UserSettings,
  LLMProviderName,
  ThemeMode,
  SidebarPosition,
  TabBarPosition,
} from "@mixa-ai/types";
import { trpc } from "../trpc";
import { useThemeStore } from "./theme";

interface SettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  activeSection: SettingsSection;

  // Actions
  loadSettings: () => Promise<void>;
  updateThemeMode: (mode: ThemeMode) => Promise<void>;
  updateAccentColor: (hex: string) => Promise<void>;
  updateFontSize: (size: number) => Promise<void>;
  updateSidebarPosition: (position: SidebarPosition) => Promise<void>;
  updateTabBarPosition: (position: TabBarPosition) => Promise<void>;
  updateCompactMode: (enabled: boolean) => Promise<void>;
  setActiveProvider: (provider: LLMProviderName) => Promise<void>;
  setSelectedModel: (provider: LLMProviderName, model: string) => Promise<void>;
  setEmbeddingConfig: (provider: LLMProviderName, model: string) => Promise<void>;
  setApiKey: (provider: LLMProviderName, apiKey: string) => Promise<void>;
  deleteApiKey: (provider: LLMProviderName) => Promise<void>;
  updateAutoCapture: (enabled: boolean) => Promise<void>;
  updateAutoCaptureMinSeconds: (seconds: number) => Promise<void>;
  updateAugmentedBrowsing: (enabled: boolean) => Promise<void>;
  updateDefaultSearchEngine: (url: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setActiveSection: (section: SettingsSection) => void;
  clearError: () => void;
}

export type SettingsSection =
  | "ai-providers"
  | "appearance"
  | "engine"
  | "shortcuts"
  | "data"
  | "general"
  | "about";

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,
  activeSection: "ai-providers",

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await trpc.settings.get.query();
      set({ settings, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load settings",
        isLoading: false,
      });
    }
  },

  updateThemeMode: async (mode) => {
    const { settings } = get();
    if (!settings) return;

    // Apply immediately via theme store
    useThemeStore.getState().setMode(mode);

    set({
      settings: { ...settings, theme: { ...settings.theme, mode } },
    });

    try {
      await trpc.settings.update.mutate({ theme: { mode } });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update theme mode" });
    }
  },

  updateAccentColor: async (hex) => {
    const { settings } = get();
    if (!settings) return;

    useThemeStore.getState().setAccentColor(hex);

    set({
      settings: { ...settings, theme: { ...settings.theme, accentColor: hex } },
    });

    try {
      await trpc.settings.update.mutate({ theme: { accentColor: hex } });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update accent color" });
    }
  },

  updateFontSize: async (fontSize) => {
    const { settings } = get();
    if (!settings) return;

    set({
      settings: { ...settings, theme: { ...settings.theme, fontSize } },
    });

    try {
      await trpc.settings.update.mutate({ theme: { fontSize } });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update font size" });
    }
  },

  updateSidebarPosition: async (sidebarPosition) => {
    const { settings } = get();
    if (!settings) return;

    set({
      settings: { ...settings, theme: { ...settings.theme, sidebarPosition } },
    });

    try {
      await trpc.settings.update.mutate({ theme: { sidebarPosition } });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update sidebar position" });
    }
  },

  updateTabBarPosition: async (tabBarPosition) => {
    const { settings } = get();
    if (!settings) return;

    set({
      settings: { ...settings, theme: { ...settings.theme, tabBarPosition } },
    });

    try {
      await trpc.settings.update.mutate({ theme: { tabBarPosition } });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update tab bar position" });
    }
  },

  updateCompactMode: async (compactMode) => {
    const { settings } = get();
    if (!settings) return;

    set({
      settings: { ...settings, theme: { ...settings.theme, compactMode } },
    });

    try {
      await trpc.settings.update.mutate({ theme: { compactMode } });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update compact mode" });
    }
  },

  setActiveProvider: async (provider) => {
    const { settings } = get();
    if (!settings) return;

    const updated = {
      ...settings,
      llm: {
        ...settings.llm,
        providers: settings.llm.providers.map((p) => ({
          ...p,
          isActive: p.name === provider,
        })),
      },
    };
    set({ settings: updated });

    try {
      await trpc.settings.update.mutate({ llm: { activeProvider: provider } });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to set active provider" });
    }
  },

  setSelectedModel: async (provider, model) => {
    const { settings } = get();
    if (!settings) return;

    const updated = {
      ...settings,
      llm: {
        ...settings.llm,
        providers: settings.llm.providers.map((p) =>
          p.name === provider ? { ...p, selectedModel: model } : p,
        ),
      },
    };
    set({ settings: updated });

    try {
      await trpc.settings.update.mutate({
        llm: { activeProvider: provider, selectedModel: model },
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to set model" });
    }
  },

  setEmbeddingConfig: async (provider, model) => {
    const { settings } = get();
    if (!settings) return;

    const updated = {
      ...settings,
      llm: {
        ...settings.llm,
        embeddingProvider: provider,
        embeddingModel: model,
      },
    };
    set({ settings: updated });

    try {
      await trpc.settings.update.mutate({
        llm: { embeddingProvider: provider, embeddingModel: model },
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update embedding config" });
    }
  },

  setApiKey: async (provider, apiKey) => {
    const { settings } = get();
    if (!settings) return;

    try {
      await trpc.settings.setApiKey.mutate({ provider, apiKey });
      // Update local state to reflect key is now configured
      const updated = {
        ...settings,
        llm: {
          ...settings.llm,
          providers: settings.llm.providers.map((p) =>
            p.name === provider ? { ...p, apiKeyConfigured: true } : p,
          ),
        },
      };
      set({ settings: updated });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to store API key" });
    }
  },

  deleteApiKey: async (provider) => {
    const { settings } = get();
    if (!settings) return;

    try {
      await trpc.settings.deleteApiKey.mutate({ provider });
      const updated = {
        ...settings,
        llm: {
          ...settings.llm,
          providers: settings.llm.providers.map((p) =>
            p.name === provider ? { ...p, apiKeyConfigured: false } : p,
          ),
        },
      };
      set({ settings: updated });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to delete API key" });
    }
  },

  updateAutoCapture: async (autoCaptureEnabled) => {
    const { settings } = get();
    if (!settings) return;

    set({ settings: { ...settings, autoCaptureEnabled } });

    try {
      await trpc.settings.update.mutate({ autoCaptureEnabled });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update auto-capture" });
    }
  },

  updateAutoCaptureMinSeconds: async (autoCaptureMinSeconds) => {
    const { settings } = get();
    if (!settings) return;

    set({ settings: { ...settings, autoCaptureMinSeconds } });

    try {
      await trpc.settings.update.mutate({ autoCaptureMinSeconds });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update capture interval" });
    }
  },

  updateAugmentedBrowsing: async (augmentedBrowsingEnabled) => {
    const { settings } = get();
    if (!settings) return;

    set({ settings: { ...settings, augmentedBrowsingEnabled } });

    try {
      await trpc.settings.update.mutate({ augmentedBrowsingEnabled });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update augmented browsing" });
    }
  },

  updateDefaultSearchEngine: async (defaultSearchEngine) => {
    const { settings } = get();
    if (!settings) return;

    set({ settings: { ...settings, defaultSearchEngine } });

    try {
      await trpc.settings.update.mutate({ defaultSearchEngine });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update search engine" });
    }
  },

  completeOnboarding: async () => {
    const { settings } = get();
    if (!settings) return;

    set({ settings: { ...settings, onboardingCompleted: true } });

    try {
      await trpc.settings.update.mutate({ onboardingCompleted: true });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to complete onboarding" });
    }
  },

  setActiveSection: (section) => {
    set({ activeSection: section });
  },

  clearError: () => {
    set({ error: null });
  },
}));
