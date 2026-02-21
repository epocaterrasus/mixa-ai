// Chat IPC handler for streaming message responses
// Uses dedicated IPC events (not tRPC) for token streaming

import { ipcMain, type WebContents } from "electron";
import * as chatStore from "./store.js";

const PLACEHOLDER_RESPONSE =
  "I'm **Mixa**, your knowledge assistant. I can help you find and discuss information from your saved knowledge base.\n\n" +
  "To get started:\n" +
  "1. **Save some content** — browse the web and press `Cmd+S` to capture pages\n" +
  "2. **Configure an AI provider** — go to Settings and add your API key (OpenAI, Anthropic, Ollama, or Gemini)\n" +
  "3. **Ask me anything** — I'll search your knowledge base and provide grounded answers with citations\n\n" +
  "Right now, AI providers aren't configured yet, so I'm showing this placeholder. Once everything is set up, I'll give you real AI-powered answers from your saved content.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function streamPlaceholderResponse(
  sender: WebContents,
  conversationId: string,
  messageId: string,
): Promise<void> {
  // Stream the placeholder response word by word
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

  // Final chunk
  if (!sender.isDestroyed()) {
    sender.send("chat:stream-chunk", {
      conversationId,
      messageId,
      content: accumulated,
      done: true,
      citations: [],
    });
  }

  // Store the complete assistant message
  chatStore.addMessage(conversationId, "assistant", accumulated, [], "placeholder");
}

export function setupChatHandlers(): void {
  ipcMain.handle(
    "chat:send-message",
    async (
      event,
      data: { conversationId: string; content: string },
    ): Promise<{ userMessageId: string; assistantMessageId: string }> => {
      const { conversationId, content } = data;

      // Verify conversation exists
      const conversation = chatStore.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      // Store user message
      const userMessage = chatStore.addMessage(conversationId, "user", content);

      // Create placeholder for assistant message
      const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Stream response asynchronously
      void streamPlaceholderResponse(
        event.sender,
        conversationId,
        assistantMessageId,
      );

      return {
        userMessageId: userMessage.id,
        assistantMessageId,
      };
    },
  );
}
