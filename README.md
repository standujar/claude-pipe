<p align="center">
  <h1 align="center">claude-pipe</h1>
  <p align="center">
    Use your Claude Max subscription as a standard API.<br/>
    One command. Every tool. Zero extra cost.
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/claude-pipe"><img src="https://img.shields.io/npm/v/claude-pipe?color=cb3837&label=npm" alt="npm"></a>
    <a href="https://github.com/standujar/claude-pipe/actions"><img src="https://github.com/standujar/claude-pipe/actions/workflows/publish.yml/badge.svg" alt="CI"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License"></a>
  </p>
</p>

---

You pay $200/mo for Claude Max. Your tools all want an API key that costs extra. **Why pay twice?**

**claude-pipe** exposes your subscription as a standard Anthropic/OpenAI API on localhost. Streaming, web search, extended thinking — all included. No tokens extracted, no OAuth hacks. Just `claude -p` under the hood.

## Getting started

### Install

<details open>
<summary><strong>npm</strong> (recommended)</summary>

```bash
npm install -g claude-pipe
claude-pipe
```
</details>

<details>
<summary><strong>bun</strong></summary>

```bash
bunx claude-pipe
```
</details>

<details>
<summary><strong>from source</strong></summary>

```bash
git clone https://github.com/standujar/claude-pipe.git
cd claude-pipe
bun run start
```
</details>

### Prerequisites

- [Claude Code](https://code.claude.com) installed and authenticated (`claude auth login`)
- [Bun](https://bun.sh) runtime
- Claude Pro or Max subscription

### Verify it works

```bash
curl http://localhost:4523/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: anything" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-sonnet-4-6","max_tokens":100,"messages":[{"role":"user","content":"Hello!"}]}'
```

## Use with your tools

> **API key**: always set to `anything` (the proxy ignores it — auth is handled by Claude Code)

<details open>
<summary><strong>Cursor</strong></summary>

Settings → Models → OpenAI API Key:

| Setting | Value |
|---|---|
| API Key | `anything` |
| Override OpenAI Base URL | `http://127.0.0.1:4523/v1` |
| Model | `claude-sonnet-4-6` |
</details>

<details>
<summary><strong>Cline</strong> (VS Code)</summary>

Cline settings → Provider: **OpenAI Compatible**:

| Setting | Value |
|---|---|
| Base URL | `http://127.0.0.1:4523/v1` |
| API Key | `anything` |
| Model ID | `claude-sonnet-4-6` |
</details>

<details>
<summary><strong>Continue.dev</strong> (VS Code)</summary>

`~/.continue/config.yaml`:

```yaml
models:
  - name: Claude (Max)
    provider: anthropic
    model: claude-sonnet-4-6
    apiBase: http://127.0.0.1:4523
    apiKey: anything
```
</details>

<details>
<summary><strong>Aider</strong></summary>

```bash
ANTHROPIC_API_KEY=anything \
ANTHROPIC_BASE_URL=http://127.0.0.1:4523 \
aider --model claude-sonnet-4-6
```
</details>

<details>
<summary><strong>Vercel AI SDK</strong></summary>

```typescript
import { createAnthropic } from "@ai-sdk/anthropic";

const anthropic = createAnthropic({
  apiKey: "anything",
  baseURL: "http://127.0.0.1:4523",
});
```

Or via env:

```bash
ANTHROPIC_API_KEY=anything ANTHROPIC_BASE_URL=http://127.0.0.1:4523 bun run app.ts
```
</details>

<details>
<summary><strong>LangChain</strong></summary>

```typescript
import { ChatAnthropic } from "@langchain/anthropic";

const model = new ChatAnthropic({
  modelName: "claude-sonnet-4-6",
  anthropicApiKey: "anything",
  anthropicApiUrl: "http://127.0.0.1:4523",
});
```
</details>

<details>
<summary><strong>LlamaIndex</strong></summary>

```python
from llama_index.llms.anthropic import Anthropic

llm = Anthropic(
    model="claude-sonnet-4-6",
    api_key="anything",
    base_url="http://127.0.0.1:4523",
)
```
</details>

<details>
<summary><strong>OpenAI SDK</strong> (Python / TypeScript)</summary>

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
</details>

<details>
<summary><strong>n8n</strong></summary>

Use the **HTTP Request** node:

| Setting | Value |
|---|---|
| URL | `http://127.0.0.1:4523/v1/messages` |
| Method | POST |
| Headers | `content-type: application/json`, `x-api-key: anything`, `anthropic-version: 2023-06-01` |
</details>

<details>
<summary><strong>Dify</strong></summary>

Model Provider → Anthropic:

| Setting | Value |
|---|---|
| API Key | `anything` |
| API URL | `http://127.0.0.1:4523` |
</details>

## Endpoints

| Endpoint | Format | Description |
|---|---|---|
| `POST /v1/messages` | Anthropic | Messages API (streaming + non-streaming) |
| `POST /v1/chat/completions` | OpenAI | Chat Completions (streaming + non-streaming) |
| `GET /v1/models` | Both | List available models |
| `GET /health` | — | Health check |

## Models

All Claude models are supported. Use full names or short aliases:

| Alias | Model |
|---|---|
| `sonnet` | `claude-sonnet-4-6` |
| `opus` | `claude-opus-4-6` |
| `haiku` | `claude-haiku-4-5` |
| `sonnet-4.5` | `claude-sonnet-4-5` |
| `opus-4.5` | `claude-opus-4-5` |
| `opus-4.1` | `claude-opus-4-1` |
| `gpt-4` / `gpt-4o` | `claude-sonnet-4-6` |
| `gpt-4o-mini` | `claude-haiku-4-5` |

Any other model name (e.g. `claude-sonnet-4-5-20250929`) is passed through as-is to the CLI.

## What works

| Feature | |
|---|---|
| Streaming (SSE) | Supported — real-time token streaming |
| Non-streaming | Supported |
| System prompt | Supported |
| Web search | Supported — pass `tools: [{ type: "web_search_20250305" }]` |
| Extended thinking | Supported — mapped to `--effort` |
| Multi-turn | Supported — serialized to prompt |
| Token usage | Supported — reported in response |

## What doesn't (CLI limitations)

These API parameters are accepted but **silently ignored** — the CLI has no equivalent flags:

`max_tokens` · `temperature` · `top_p` / `top_k` · `stop_sequences` · custom tools (function calling) · image/document input

## How it works

```
Your tool (Cursor, Aider, LangChain, n8n...)
    ↓
  POST /v1/messages  or  /v1/chat/completions
    ↓
  claude-pipe (localhost:4523)
    ↓
  claude -p --model X --output-format stream-json
    ↓
  Claude Code CLI → your Max subscription
```

No OAuth tokens extracted. No authentication spoofed. The official CLI handles everything.

## License

MIT — [LICENSE](LICENSE)

---

<p align="center">
  If this saves you money, <a href="https://github.com/standujar/claude-pipe">give it a star</a>.
</p>
