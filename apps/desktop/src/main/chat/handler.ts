import { ipcMain, type WebContents } from "electron";
import * as chatStore from "./store.js";
import { loadSettings } from "../trpc/routers/settings.js";
import { getApiKey } from "../settings/keychain.js";
import {
  ProviderRouter,
  type ProviderCredentials,
  type ChatMessage,
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMProviderUnavailableError,
} from "@mixa-ai/ai-pipeline";

const PLACEHOLDER_RESPONSE =
  "I'm **Mixa**, your knowledge assistant. I can help you find and discuss information from your saved knowledge base.\n\n" +
  "To get started:\n" +
  "1. **Save some content** — browse the web and press `Cmd+S` to capture pages\n" +
  "2. **Configure an AI provider** — go to Settings and add your API key (OpenAI, Anthropic, Ollama, or Gemini)\n" +
  "3. **Ask me anything** — I'll search your knowledge base and provide grounded answers with citations\n\n" +
  "Right now, no AI provider is active. Once you configure one in Settings, I'll give you real AI-powered answers.";

const SYSTEM_PROMPT =
  "You are Mixa, a helpful knowledge assistant embedded in a browser. " +
  "Answer the user's questions clearly and concisely. " +
  "If you don't know something, say so honestly. " +
  "Use Markdown formatting where appropriate.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildProviderRouter(): ProviderRouter | null {
  const settings = loadSettings();
  const llmConfig = settings.llm;

  const activeProvider = llmConfig.providers.find((p) => p.isActive);
  if (!activeProvider) return null;

  // Ollama doesn't need an API key; cloud providers do
  if (activeProvider.name !== "ollama") {
    const key = getApiKey(activeProvider.name);
    if (!key) return null;
  }

  const credentials: ProviderCredentials = {};

  for (const provider of llmConfig.providers) {
    const key = getApiKey(provider.name);
    if (key) {
      credentials[provider.name] = {
        apiKey: key,
        baseUrl: provider.baseUrl ?? undefined,
      };
    } else if (provider.name === "ollama") {
      credentials.ollama = {
        apiKey: "",
        baseUrl: provider.baseUrl ?? "http://localhost:11434",
      };
    }
  }

  return new ProviderRouter(llmConfig, credentials);
}

async function streamPlaceholderResponse(
  sender: WebContents,
  conversationId: string,
  messageId: string,
): Promise<void> {
  const words = PLACEHOLDER_RESPONSE.split(" ");
  let accumulated = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word === undefined) continue;
    accumulated += (i > 0 ? " " : "") + word;

    if (sender.isDestroyed()) return;

    sender.send("chat:stream-chunk", {
      conversationId,
      messageId,
      content: accumulated,
      done: false,
      citations: [],
    });

    await sleep(20);
  }

  if (!sender.isDestroyed()) {
    sender.send("chat:stream-chunk", {
      conversationId,
      messageId,
      content: accumulated,
      done: true,
      citations: [],
    });
  }

  await chatStore.addMessage(conversationId, "assistant", accumulated, [], "placeholder");
}

function formatProviderError(error: unknown): string {
  if (error instanceof LLMAuthenticationError) {
    return "**Authentication failed** — your API key appears to be invalid or expired. Please check it in Settings.";
  }
  if (error instanceof LLMRateLimitError) {
    return "**Rate limited** — the AI provider is throttling requests. Please wait a moment and try again.";
  }
  if (error instanceof LLMProviderUnavailableError) {
    return "**Provider unavailable** — could not connect to the AI provider. Check your internet connection or provider status.";
  }
  if (error instanceof Error) {
    return `**Error:** ${error.message}`;
  }
  return "**Unexpected error** — something went wrong. Please try again.";
}

async function streamAIResponse(
  sender: WebContents,
  conversationId: string,
  messageId: string,
  userContent: string,
): Promise<void> {
  const router = buildProviderRouter();

  if (!router) {
    await streamPlaceholderResponse(sender, conversationId, messageId);
    return;
  }

  try {
    const model = router.getActiveChatModel();
    const provider = router.getChatProvider();

    // Load conversation history for multi-turn context
    const storedMessages = await chatStore.getMessages(conversationId);
    const chatHistory: ChatMessage[] = storedMessages
      .filter((m) => m.id !== `temp-user-${Date.now()}`)
      .slice(-20) // Keep last 20 messages for context window
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatHistory,
      { role: "user", content: userContent },
    ];

    let fullContent = "";

    for await (const chunk of provider.stream({
      model,
      messages,
      temperature: 0.3,
      maxTokens: 4096,
    })) {
      fullContent += chunk.content;

      if (sender.isDestroyed()) return;

      sender.send("chat:stream-chunk", {
        conversationId,
        messageId,
        content: fullContent,
        done: chunk.done,
        citations: [],
      });
    }

    // Ensure we send a final done=true if the stream ended without one
    if (!sender.isDestroyed()) {
      sender.send("chat:stream-chunk", {
        conversationId,
        messageId,
        content: fullContent,
        done: true,
        citations: [],
      });
    }

    await chatStore.addMessage(conversationId, "assistant", fullContent, [], model);
  } catch (error) {
    const errorContent = formatProviderError(error);

    if (!sender.isDestroyed()) {
      sender.send("chat:stream-chunk", {
        conversationId,
        messageId,
        content: errorContent,
        done: true,
        citations: [],
      });
    }

    await chatStore.addMessage(conversationId, "assistant", errorContent, [], null);
  }
}

export function setupChatHandlers(): void {
  ipcMain.handle(
    "chat:send-message",
    async (
      event,
      data: { conversationId: string; content: string },
    ): Promise<{ userMessageId: string; assistantMessageId: string }> => {
      const { conversationId, content } = data;

      const conversation = await chatStore.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      const userMessage = await chatStore.addMessage(conversationId, "user", content);

      const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      void streamAIResponse(
        event.sender,
        conversationId,
        assistantMessageId,
        content,
      );

      return {
        userMessageId: userMessage.id,
        assistantMessageId,
      };
    },
  );
}
