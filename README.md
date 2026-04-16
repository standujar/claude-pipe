# claude-pipe

[![npm version](https://img.shields.io/npm/v/claude-pipe)](https://www.npmjs.com/package/claude-pipe)
[![CI](https://github.com/standujar/claude-pipe/actions/workflows/publish.yml/badge.svg)](https://github.com/standujar/claude-pipe/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

You pay $200/mo for Claude Max. Your tools (Cursor, Cline, Aider, LangChain, n8n...) all want an API key that costs extra. Why pay twice?

**claude-pipe** exposes your Claude Max subscription as a standard Anthropic API on localhost. Any tool that speaks the Anthropic or OpenAI API format works out of the box — streaming, web search, extended thinking included. No tokens extracted, no OAuth hacks. Just `claude -p` under the hood.

```bash
bunx claude-pipe
```

```
claude-pipe
Listening on http://127.0.0.1:4523

Anthropic API:  POST /v1/messages
OpenAI API:     POST /v1/chat/completions
Models:         GET  /v1/models
```

## Quick test

```bash
curl http://localhost:4523/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: anything" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-sonnet-4-6","max_tokens":100,"messages":[{"role":"user","content":"Hello!"}]}'
```

## Tool configuration

### Cursor

Cursor uses OpenAI format. Go to **Settings → Models → OpenAI API Key**:

- **API Key**: `anything` (ignored by the proxy)
- **Override OpenAI Base URL**: `http://127.0.0.1:4523/v1`
- Select `claude-sonnet-4-6` or `claude-opus-4-6` as the model

### Cline (VS Code)

Open Cline settings → **Provider: OpenAI Compatible**:

- **Base URL**: `http://127.0.0.1:4523/v1`
- **API Key**: `anything`
- **Model ID**: `claude-sonnet-4-6`

### Continue.dev (VS Code)

In `~/.continue/config.yaml`:

```yaml
models:
  - name: Claude (Max)
    provider: anthropic
    model: claude-sonnet-4-6
    apiBase: http://127.0.0.1:4523
    apiKey: anything
```

### Aider

```bash
ANTHROPIC_API_KEY=anything \
ANTHROPIC_BASE_URL=http://127.0.0.1:4523 \
aider --model claude-sonnet-4-6
```

### Vercel AI SDK

```typescript
import { createAnthropic } from "@ai-sdk/anthropic";

const anthropic = createAnthropic({
  apiKey: "anything",
  baseURL: "http://127.0.0.1:4523",
});
```

Or via environment variables:

```bash
ANTHROPIC_API_KEY=anything \
ANTHROPIC_BASE_URL=http://127.0.0.1:4523 \
bun run my-app.ts
```

### LangChain

```typescript
import { ChatAnthropic } from "@langchain/anthropic";

const model = new ChatAnthropic({
  modelName: "claude-sonnet-4-6",
  anthropicApiKey: "anything",
  anthropicApiUrl: "http://127.0.0.1:4523",
});
```

### LlamaIndex

```python
from llama_index.llms.anthropic import Anthropic

llm = Anthropic(
    model="claude-sonnet-4-6",
    api_key="anything",
    base_url="http://127.0.0.1:4523",
)
```

### n8n

Use the **HTTP Request** node with:

- **URL**: `http://127.0.0.1:4523/v1/messages`
- **Method**: POST
- **Headers**: `content-type: application/json`, `x-api-key: anything`, `anthropic-version: 2023-06-01`

### Dify

In **Model Provider → Anthropic**:

- **API Key**: `anything`
- **API URL**: `http://127.0.0.1:4523`

### OpenAI SDK (Python/TypeScript)

Works with the OpenAI-compatible endpoint:

```python
from openai import OpenAI

client = OpenAI(
    api_key="anything",
    base_url="http://127.0.0.1:4523/v1",
)

response = client.chat.completions.create(
    model="claude-sonnet-4-6",
    messages=[{"role": "user", "content": "Hello!"}],
)
```

## Model aliases

| Alias | Resolves to |
|---|---|
| `sonnet` | `claude-sonnet-4-6` |
| `opus` | `claude-opus-4-6` |
| `haiku` | `claude-haiku-4-5` |
| `gpt-4` | `claude-sonnet-4-6` |
| `gpt-4o` | `claude-sonnet-4-6` |
| `gpt-4o-mini` | `claude-haiku-4-5` |

## Features

| Feature | Status |
|---|---|
| Non-streaming | Supported |
| Streaming (SSE) | Supported |
| System prompt | Supported |
| Web search (`tools: [web_search]`) | Supported |
| Extended thinking | Mapped to `--effort` |
| Multi-turn conversations | Serialized to XML |
| Token usage reporting | Supported |

## Limitations

These API parameters are accepted but ignored (no CLI equivalent):

- `max_tokens`
- `temperature`
- `top_p` / `top_k`
- `stop_sequences`
- Custom tool definitions (function calling)
- Image/document input

## Prerequisites

- [Claude Code CLI](https://code.claude.com) installed and authenticated (`claude auth login`)
- [Bun](https://bun.sh) runtime
- Claude Pro or Max subscription

## How it works

```
Your tool (Cursor, LangChain, etc.)
    ↓ POST /v1/messages or /v1/chat/completions
    ↓
  claude-pipe (localhost:4523)
    ↓ spawn: claude -p --model X --output-format stream-json
    ↓ translate NDJSON events → SSE
    ↓
  Claude Code CLI (your Max subscription)
```

## Disclaimer

This project uses `claude -p` (the official Claude Code CLI headless mode) to route API calls through your subscription.

No OAuth tokens are extracted. No authentication is spoofed. The real CLI handles all authentication.

## License

MIT

---

If this saves you money, give it a star on [GitHub](https://github.com/standujar/claude-pipe).
