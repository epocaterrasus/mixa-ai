import { ipcMain, type WebContents } from "electron";
import * as chatStore from "./store.js";
import { loadSettings } from "../trpc/routers/settings.js";
import { getApiKey } from "../settings/keychain.js";
import { getUserId, getSqlClient } from "../db/index.js";
import {
  ProviderRouter,
  ragStream,
  type ProviderCredentials,
  type ChatMessage,
  type RAGStreamChunk,
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMProviderUnavailableError,
} from "@mixa-ai/ai-pipeline";
import type { Citation, ChatScope } from "@mixa-ai/types";

type RagSqlClient = Parameters<typeof ragStream>[0];

const PLACEHOLDER_RESPONSE =
  "I'm **Mixa**, your knowledge assistant. I can help you find and discuss information from your saved knowledge base.\n\n" +
  "To get started:\n" +
  "1. **Save some content** — browse the web and press `Cmd+S` to capture pages\n" +
  "2. **Configure an AI provider** — go to Settings and add your API key (OpenAI, Anthropic, Ollama, or Gemini)\n" +
  "3. **Ask me anything** — I'll search your knowledge base and provide grounded answers with citations\n\n" +
  "Right now, no AI provider is active. Once you configure one in Settings, I'll give you real AI-powered answers.";

const DIRECT_SYSTEM_PROMPT =
  "You are Mixa, an AI knowledge assistant built into a desktop browser app. " +
  "The user is chatting with you inside the Mixa app, which is a full web browser with a built-in knowledge base.\n\n" +
  "KEY CAPABILITIES the user already has in this app:\n" +
  "- **Browse the web** — Mixa has a full browser with tabs, just like Chrome or Safari.\n" +
  "- **Save any web page** — the user can press Cmd+S (or right-click → Save to Mixa) to capture the current page into their knowledge base.\n" +
  "- **Save text selections** — the user can highlight text on any page and save just that selection.\n" +
  "- **Search saved knowledge** — you can search across everything the user has saved.\n" +
  "- **Chat with knowledge** — when the user asks you questions, you search their saved content and answer with citations.\n\n" +
  "IMPORTANT RULES:\n" +
  "- NEVER suggest external tools, libraries, or services for tasks the app already handles (web browsing, saving pages, searching knowledge).\n" +
  "- If the user asks to open or visit a website, tell them to use the browser tab bar or Cmd+T to open a new tab and navigate there.\n" +
  "- If the user asks to save or capture content, tell them to navigate to the page and press Cmd+S.\n" +
  "- Answer clearly and concisely. Use Markdown formatting where appropriate.\n" +
  "- If you don't know something and it's not in the knowledge base, say so honestly.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildProviderRouter(): ProviderRouter | null {
  const settings = loadSettings();
  const llmConfig = settings.llm;

  const activeProvider = llmConfig.providers.find((p) => p.isActive);
  if (!activeProvider) return null;

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

function describeError(error: unknown): string {
  if (error instanceof LLMAuthenticationError) {
    return `Authentication failed for ${error.provider} — your API key appears to be invalid or expired. Please check it in Settings.`;
  }
  if (error instanceof LLMRateLimitError) {
    const retry = error.retryAfterMs
      ? ` (retry after ${Math.ceil(error.retryAfterMs / 1000)}s)`
      : "";
    return `Rate limited by ${error.provider}${retry} — please wait a moment and try again.`;
  }
  if (error instanceof LLMProviderUnavailableError) {
    const cause = error.cause instanceof Error ? `: ${error.cause.message}` : "";
    return `Could not reach ${error.provider}${cause}. Check your internet connection or provider status.`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function formatProviderError(error: unknown): string {
  return `**Error:** ${describeError(error)}`;
}

/**
 * Stream a RAG response: retrieve context from the knowledge base, then generate.
 * Falls back to direct chat (no retrieval) if the SQL client is unavailable.
 */
async function streamRAGResponse(
  sender: WebContents,
  conversationId: string,
  messageId: string,
  userContent: string,
  router: ProviderRouter,
  scope: ChatScope | null,
  modelOverride?: string,
): Promise<void> {
  const userId = getUserId();
  const sqlClient = getSqlClient() as RagSqlClient;

  const storedMessages = await chatStore.getMessages(conversationId);
  const chatHistory: ChatMessage[] = storedMessages
    .slice(-20)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  let fullContent = "";
  let finalCitations: Citation[] = [];
  const model = modelOverride ?? router.getActiveChatModel();

  const stream: AsyncGenerator<RAGStreamChunk> = ragStream(sqlClient, router, {
    query: userContent,
    userId,
    scope: scope ?? undefined,
    chatHistory,
  });

  for await (const chunk of stream) {
    fullContent += chunk.content;

    if (sender.isDestroyed()) return;

    if (chunk.done && chunk.citations) {
      finalCitations = chunk.citations;
    }

    sender.send("chat:stream-chunk", {
      conversationId,
      messageId,
      content: fullContent,
      done: chunk.done,
      citations: chunk.done ? finalCitations : [],
    });
  }

  if (!sender.isDestroyed()) {
    sender.send("chat:stream-chunk", {
      conversationId,
      messageId,
      content: fullContent,
      done: true,
      citations: finalCitations,
    });
  }

  await chatStore.addMessage(conversationId, "assistant", fullContent, finalCitations, model);
}

/**
 * Stream a direct chat response (no retrieval, no citations).
 * Used as a fallback when the knowledge base is not available.
 */
async function streamDirectResponse(
  sender: WebContents,
  conversationId: string,
  messageId: string,
  userContent: string,
  router: ProviderRouter,
  modelOverride?: string,
): Promise<void> {
  const model = modelOverride ?? router.getActiveChatModel();
  const provider = router.getChatProvider();

  const storedMessages = await chatStore.getMessages(conversationId);
  const chatHistory: ChatMessage[] = storedMessages
    .slice(-20)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const messages: ChatMessage[] = [
    { role: "system", content: DIRECT_SYSTEM_PROMPT },
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
}

async function streamAIResponse(
  sender: WebContents,
  conversationId: string,
  messageId: string,
  userContent: string,
  scope: ChatScope | null,
  modelOverride?: string,
): Promise<void> {
  const router = buildProviderRouter();

  if (!router) {
    console.warn("[chat] No active provider or missing API key — sending placeholder");
    await streamPlaceholderResponse(sender, conversationId, messageId);
    return;
  }

  try {
    await streamRAGResponse(sender, conversationId, messageId, userContent, router, scope, modelOverride);
  } catch (ragError) {
    console.warn("[chat] RAG response failed, falling back to direct:", describeError(ragError));

    try {
      await streamDirectResponse(sender, conversationId, messageId, userContent, router, modelOverride);
    } catch (directError) {
      console.error("[chat] Direct response also failed:", directError);
      const errorContent = formatProviderError(directError);

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
}

export function setupChatHandlers(): void {
  ipcMain.handle(
    "chat:send-message",
    async (
      event,
      data: { conversationId: string; content: string; modelOverride?: string },
    ): Promise<{ userMessageId: string; assistantMessageId: string }> => {
      const { conversationId, content, modelOverride } = data;

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
        conversation.scope as ChatScope | null,
        modelOverride,
      );

      return {
        userMessageId: userMessage.id,
        assistantMessageId,
      };
    },
  );
}
