// @mixa-ai/types — Settings & configuration types

/** Supported LLM provider identifiers */
export type LLMProviderName = "openai" | "anthropic" | "gemini" | "ollama";

/** Configuration for a single LLM provider (BYOK) */
export interface LLMProvider {
  name: LLMProviderName;
  displayName: string;
  apiKeyConfigured: boolean;
  selectedModel: string;
  availableModels: string[];
  isActive: boolean;
  baseUrl: string | null;
}

/** LLM configuration — which provider is active and settings */
export interface LLMConfig {
  providers: LLMProvider[];
  embeddingProvider: LLMProviderName;
  embeddingModel: string;
}

/** Theme mode */
export type ThemeMode = "dark" | "light" | "system";

/** Sidebar position */
export type SidebarPosition = "left" | "right";

/** Tab bar position */
export type TabBarPosition = "top" | "bottom";

/** Theme and appearance configuration */
export interface ThemeConfig {
  mode: ThemeMode;
  accentColor: string;
  fontFamily: string;
  fontSize: number;
  sidebarPosition: SidebarPosition;
  tabBarPosition: TabBarPosition;
  compactMode: boolean;
}

/** Keyboard shortcut definition */
export interface KeyboardShortcut {
  id: string;
  label: string;
  keys: string;
  category: string;
}

/** Media bar position */
export type MediaBarPosition = "top" | "bottom";

/** Media bar configuration */
export interface MediaBarConfig {
  enabled: boolean;
  position: MediaBarPosition;
}

/** Top-level user settings */
export interface UserSettings {
  llm: LLMConfig;
  theme: ThemeConfig;
  shortcuts: KeyboardShortcut[];
  autoCaptureEnabled: boolean;
  autoCaptureMinSeconds: number;
  augmentedBrowsingEnabled: boolean;
  defaultSearchEngine: string;
  onboardingCompleted: boolean;
  mediaBar: MediaBarConfig;
}
