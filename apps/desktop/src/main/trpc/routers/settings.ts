import { z } from "zod";
import type { UserSettings } from "@mixa-ai/types";
import { router, publicProcedure } from "../trpc.js";

const llmProviderNameSchema = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "ollama",
]);

const themeModeSchema = z.enum(["dark", "light", "system"]);
const sidebarPositionSchema = z.enum(["left", "right"]);
const tabBarPositionSchema = z.enum(["top", "bottom"]);

const defaultSettings: UserSettings = {
  llm: {
    providers: [
      {
        name: "openai",
        displayName: "OpenAI",
        apiKeyConfigured: false,
        selectedModel: "gpt-4o-mini",
        availableModels: ["gpt-4o", "gpt-4o-mini"],
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
          "claude-haiku-4-5-20251001",
        ],
        isActive: false,
        baseUrl: null,
      },
      {
        name: "gemini",
        displayName: "Google Gemini",
        apiKeyConfigured: false,
        selectedModel: "gemini-2.0-flash",
        availableModels: ["gemini-2.0-flash"],
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
};

export const settingsRouter = router({
  get: publicProcedure.query(async (): Promise<UserSettings> => {
    // TODO: Load from persistent storage (electron-store or PGlite)
    return defaultSettings;
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
        defaultSearchEngine: z.string().url().optional(),
      }),
    )
    .mutation(async ({ input: _input }): Promise<UserSettings> => {
      // TODO: Persist settings to storage
      return defaultSettings;
    }),
});
