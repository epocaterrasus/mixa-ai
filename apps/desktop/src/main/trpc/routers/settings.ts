import { z } from "zod";
import type { UserSettings, LLMProviderName } from "@mixa-ai/types";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { router, publicProcedure } from "../trpc.js";
import {
  storeApiKey,
  deleteApiKey,
  getApiKey,
  getApiKeyStatus,
} from "../../settings/keychain.js";
import { net } from "electron";
import { augmentedBrowsingService } from "../../augmented/index.js";
import {
  ProviderRouter,
  type ProviderCredentials,
} from "@mixa-ai/ai-pipeline";

const llmProviderNameSchema = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "ollama",
]);

const themeModeSchema = z.enum(["dark", "light", "system"]);
const sidebarPositionSchema = z.enum(["left", "right"]);
const tabBarPositionSchema = z.enum(["top", "bottom"]);
const mediaBarPositionSchema = z.enum(["top", "bottom"]);

// --- File-based settings persistence ---

const MIXA_DIR = join(homedir(), ".mixa");
const SETTINGS_FILE = join(MIXA_DIR, "settings.json");

function ensureDir(): void {
  if (!existsSync(MIXA_DIR)) {
    mkdirSync(MIXA_DIR, { recursive: true });
  }
}

const defaultSettings: UserSettings = {
  llm: {
    providers: [
      {
        name: "openai",
        displayName: "OpenAI",
        apiKeyConfigured: false,
        selectedModel: "gpt-4o-mini",
        availableModels: [
          "gpt-4.1",
          "gpt-4.1-mini",
          "gpt-4.1-nano",
          "gpt-4o",
          "gpt-4o-mini",
          "o3-mini",
          "o4-mini",
          "gpt-4-turbo",
        ],
        isActive: false,
        baseUrl: null,
      },
      {
        name: "anthropic",
        displayName: "Anthropic",
        apiKeyConfigured: false,
        selectedModel: "claude-sonnet-4-20250514",
        availableModels: [
          "claude-sonnet-4-20250514",
          "claude-opus-4-20250514",
          "claude-haiku-4-20250414",
          "claude-3-5-sonnet-20241022",
          "claude-3-5-haiku-20241022",
          "claude-3-opus-20240229",
        ],
        isActive: false,
        baseUrl: null,
      },
      {
        name: "gemini",
        displayName: "Google Gemini",
        apiKeyConfigured: false,
        selectedModel: "gemini-2.0-flash",
        availableModels: [
          "gemini-2.5-pro",
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-2.0-flash-lite",
          "gemini-1.5-pro",
          "gemini-1.5-flash",
        ],
        isActive: false,
        baseUrl: null,
      },
      {
        name: "ollama",
        displayName: "Ollama (Local)",
        apiKeyConfigured: false,
        selectedModel: "",
        availableModels: [],
        isActive: false,
        baseUrl: "http://localhost:11434",
      },
    ],
    embeddingProvider: "openai",
    embeddingModel: "text-embedding-3-small",
  },
  theme: {
    mode: "dark",
    accentColor: "#6366f1",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    sidebarPosition: "left",
    tabBarPosition: "top",
    compactMode: false,
  },
  shortcuts: [],
  autoCaptureEnabled: false,
  autoCaptureMinSeconds: 30,
  augmentedBrowsingEnabled: true,
  defaultSearchEngine: "https://www.google.com/search?q=",
  onboardingCompleted: false,
  mediaBar: {
    enabled: true,
    position: "bottom",
  },
};

export function loadSettings(): UserSettings {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = readFileSync(SETTINGS_FILE, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        // Merge with defaults to handle new fields
        return { ...defaultSettings, ...(parsed as Record<string, unknown>) } as UserSettings;
      }
    }
  } catch {
    // corrupted file, return defaults
  }
  return { ...defaultSettings };
}

function saveSettings(settings: UserSettings): void {
  ensureDir();
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

/** Merge API key status into provider list */
function withApiKeyStatus(settings: UserSettings): UserSettings {
  const keyStatus = getApiKeyStatus();
  return {
    ...settings,
    llm: {
      ...settings.llm,
      providers: settings.llm.providers.map((p) => ({
        ...p,
        apiKeyConfigured: keyStatus[p.name],
      })),
    },
  };
}

export const settingsRouter = router({
  get: publicProcedure.query(async (): Promise<UserSettings> => {
    const settings = loadSettings();
    return withApiKeyStatus(settings);
  }),

  update: publicProcedure
    .input(
      z.object({
        theme: z
          .object({
            mode: themeModeSchema.optional(),
            accentColor: z.string().optional(),
            fontFamily: z.string().optional(),
            fontSize: z.number().int().min(10).max(24).optional(),
            sidebarPosition: sidebarPositionSchema.optional(),
            tabBarPosition: tabBarPositionSchema.optional(),
            compactMode: z.boolean().optional(),
          })
          .optional(),
        llm: z
          .object({
            activeProvider: llmProviderNameSchema.optional(),
            selectedModel: z.string().optional(),
            embeddingProvider: llmProviderNameSchema.optional(),
            embeddingModel: z.string().optional(),
          })
          .optional(),
        autoCaptureEnabled: z.boolean().optional(),
        autoCaptureMinSeconds: z.number().int().min(5).max(300).optional(),
        augmentedBrowsingEnabled: z.boolean().optional(),
        defaultSearchEngine: z.string().optional(),
        onboardingCompleted: z.boolean().optional(),
        mediaBar: z
          .object({
            enabled: z.boolean().optional(),
            position: mediaBarPositionSchema.optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input }): Promise<UserSettings> => {
      const current = loadSettings();

      // Merge theme updates
      if (input.theme) {
        current.theme = { ...current.theme, ...input.theme };
      }

      // Merge LLM updates
      if (input.llm) {
        if (input.llm.activeProvider) {
          current.llm.providers = current.llm.providers.map((p) => ({
            ...p,
            isActive: p.name === input.llm?.activeProvider,
          }));
        }
        if (input.llm.selectedModel && input.llm.activeProvider) {
          current.llm.providers = current.llm.providers.map((p) =>
            p.name === input.llm?.activeProvider
              ? { ...p, selectedModel: input.llm?.selectedModel ?? p.selectedModel }
              : p,
          );
        }
        if (input.llm.embeddingProvider) {
          current.llm.embeddingProvider = input.llm.embeddingProvider;
        }
        if (input.llm.embeddingModel) {
          current.llm.embeddingModel = input.llm.embeddingModel;
        }
      }

      // Merge scalar settings
      if (input.autoCaptureEnabled !== undefined) {
        current.autoCaptureEnabled = input.autoCaptureEnabled;
      }
      if (input.autoCaptureMinSeconds !== undefined) {
        current.autoCaptureMinSeconds = input.autoCaptureMinSeconds;
      }
      if (input.augmentedBrowsingEnabled !== undefined) {
        current.augmentedBrowsingEnabled = input.augmentedBrowsingEnabled;
        augmentedBrowsingService.setEnabled(input.augmentedBrowsingEnabled);
      }
      if (input.defaultSearchEngine !== undefined) {
        current.defaultSearchEngine = input.defaultSearchEngine;
      }
      if (input.onboardingCompleted !== undefined) {
        current.onboardingCompleted = input.onboardingCompleted;
      }
      if (input.mediaBar) {
        current.mediaBar = { ...current.mediaBar, ...input.mediaBar };
      }

      saveSettings(current);
      return withApiKeyStatus(current);
    }),

  setApiKey: publicProcedure
    .input(
      z.object({
        provider: llmProviderNameSchema,
        apiKey: z.string().min(1),
      }),
    )
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      storeApiKey(input.provider as LLMProviderName, input.apiKey);
      return { success: true };
    }),

  deleteApiKey: publicProcedure
    .input(
      z.object({
        provider: llmProviderNameSchema,
      }),
    )
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      deleteApiKey(input.provider as LLMProviderName);
      return { success: true };
    }),

  getApiKeyStatus: publicProcedure.query(
    async (): Promise<Record<string, boolean>> => {
      return getApiKeyStatus();
    },
  ),

  testConnection: publicProcedure
    .input(
      z.object({
        provider: llmProviderNameSchema,
      }),
    )
    .mutation(
      async ({
        input,
      }): Promise<{ success: boolean; model: string; error?: string }> => {
        const providerName = input.provider as LLMProviderName;

        const key = getApiKey(providerName);
        if (!key && providerName !== "ollama") {
          return {
            success: false,
            model: "",
            error: `No API key found for ${providerName}. The stored key may be corrupted — try re-entering it in Settings.`,
          };
        }

        const settings = loadSettings();
        const providerConfig = settings.llm.providers.find(
          (p) => p.name === providerName,
        );
        if (!providerConfig) {
          return { success: false, model: "", error: `Provider ${providerName} not found in settings.` };
        }

        const electronFetch = net.fetch.bind(net) as typeof globalThis.fetch;
        const credentials: ProviderCredentials = {
          [providerName]:
            providerName === "ollama"
              ? {
                  apiKey: "",
                  baseUrl: providerConfig.baseUrl ?? "http://localhost:11434",
                  fetch: electronFetch,
                }
              : {
                  apiKey: key ?? "",
                  baseUrl: providerConfig.baseUrl ?? undefined,
                  fetch: electronFetch,
                },
        };

        const tempConfig = {
          ...settings.llm,
          providers: settings.llm.providers.map((p) => ({
            ...p,
            isActive: p.name === providerName,
          })),
        };

        const router = new ProviderRouter(tempConfig, credentials);

        try {
          const provider = router.getChatProvider();
          const model = providerConfig.selectedModel || "unknown";
          const response = await provider.chat({
            model,
            messages: [{ role: "user", content: "Say OK" }],
            temperature: 0,
            maxTokens: 5,
          });
          return { success: true, model: response.model };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[settings] Connection test failed for ${providerName}:`, err);
          return { success: false, model: "", error: message };
        }
      },
    ),
});
