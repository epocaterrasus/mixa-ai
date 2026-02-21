# BYOK — Bring Your Own Key

Mixa AI uses a BYOK (Bring Your Own Key) model for all AI features. No API keys are bundled or required by default. Users configure their own LLM provider credentials.

## Supported Providers

| Provider | Chat | Embeddings | Local | Free Tier |
|----------|------|------------|-------|-----------|
| OpenAI | Yes | Yes | No | No |
| Anthropic | Yes | No | No | No |
| Google Gemini | Yes | Yes | No | Yes (limited) |
| Ollama | Yes | Yes | Yes | Yes (runs locally) |

## Configuration

### Via Settings Tab (Recommended)

1. Open the Settings tab in Mixa
2. Navigate to **AI Providers**
3. Select a provider
4. Enter your API key
5. Choose a model
6. Click **Test Connection** to verify

API keys are stored in the OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service) via Electron's `safeStorage`. They are never written to disk in plaintext.

### Via Settings File

Settings are stored at `~/.mixa/settings.json`. You can edit the provider configuration directly, but API keys must still be set via the Settings tab (they are stored in the OS keychain, not in this file).

```json
{
  "llm": {
    "activeProvider": "openai",
    "providers": {
      "openai": {
        "selectedModel": "gpt-4o-mini",
        "availableModels": ["gpt-4o", "gpt-4o-mini"]
      },
      "anthropic": {
        "selectedModel": "claude-3-5-sonnet-20241022",
        "availableModels": ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"]
      },
      "gemini": {
        "selectedModel": "gemini-2.0-flash",
        "availableModels": ["gemini-2.0-flash", "gemini-1.5-pro"]
      },
      "ollama": {
        "baseUrl": "http://localhost:11434",
        "selectedModel": "llama3.2",
        "availableModels": ["llama3.2", "codellama", "mistral", "mixtral"]
      }
    },
    "embedding": {
      "provider": "openai",
      "model": "text-embedding-3-small"
    }
  }
}
```

## Provider Setup

### OpenAI

1. Create an account at [platform.openai.com](https://platform.openai.com)
2. Generate an API key at **API Keys**
3. Enter the key in Mixa Settings > AI Providers > OpenAI

**Recommended models**:
- Chat: `gpt-4o-mini` (fast, cheap) or `gpt-4o` (more capable)
- Embeddings: `text-embedding-3-small` (default, 1536 dimensions)

**Cost**: Pay-per-use. gpt-4o-mini is ~$0.15/1M input tokens.

### Anthropic

1. Create an account at [console.anthropic.com](https://console.anthropic.com)
2. Generate an API key at **API Keys**
3. Enter the key in Mixa Settings > AI Providers > Anthropic

**Recommended models**:
- Chat: `claude-3-5-sonnet-20241022` (balanced) or `claude-3-haiku-20240307` (fast, cheap)

**Note**: Anthropic does not offer an embedding API. If you use Anthropic for chat, configure a separate embedding provider (OpenAI or Ollama).

**Cost**: Pay-per-use. claude-3-haiku is ~$0.25/1M input tokens.

### Google Gemini

1. Get an API key at [aistudio.google.com](https://aistudio.google.com)
2. Enter the key in Mixa Settings > AI Providers > Gemini

**Recommended models**:
- Chat: `gemini-2.0-flash` (fast, capable)
- Embeddings: `text-embedding-004`

**Cost**: Free tier available with rate limits. Paid tier via Google Cloud.

### Ollama (Local)

Run AI models entirely on your machine. No API keys needed.

1. Install Ollama: [ollama.ai](https://ollama.ai)
2. Pull models:
   ```bash
   ollama pull llama3.2          # Chat model (~2GB)
   ollama pull nomic-embed-text  # Embedding model (~275MB)
   ```
3. Ollama runs at `http://localhost:11434` by default
4. In Mixa Settings > AI Providers > Ollama, verify the base URL

**Recommended models**:
- Chat: `llama3.2` (general), `codellama` (code-focused), `mistral` (fast)
- Embeddings: `nomic-embed-text`

**Cost**: Free. Runs on your hardware. Requires a machine with sufficient RAM (8GB+ recommended).

## How Mixa Uses AI

### Content Capture Pipeline

When you save a web page, Mixa:
1. Extracts the article content (no AI needed)
2. **Chunks** the text into ~512-token segments
3. **Generates embeddings** for each chunk (uses embedding provider)
4. **Summarizes** the content (2-3 sentences) and **auto-tags** it (3-7 topic labels)

Steps 3-4 use the cheapest available model to minimize cost.

### RAG Chat

When you ask a question:
1. **Embeds** your query (embedding provider)
2. **Searches** your knowledge base (vector + full-text)
3. **Generates** an answer citing your saved sources (chat provider)

Uses the active chat provider and model.

### Cost Optimization

Mixa automatically uses the cheapest model for background tasks:
- **Summarization**: gpt-4o-mini, claude-3-haiku, llama3.2, or gemini-2.0-flash-lite
- **Embeddings**: text-embedding-3-small, nomic-embed-text, or text-embedding-004
- **Chat (interactive)**: uses whichever model you've selected as active

## Privacy

- All AI calls go directly from your machine to the provider's API
- Mixa never proxies, logs, or stores your API calls
- API keys are stored in the OS keychain, never in plaintext
- When using Ollama, all processing happens locally — no data leaves your machine
- No telemetry or usage data is sent to Mixa's servers

## Graceful Degradation

If no AI provider is configured, Mixa works without AI features:
- Web browsing, tabs, and navigation work normally
- Content capture saves pages without summaries or tags
- Chat and semantic search are unavailable
- Knowledge base can still be browsed and filtered manually
