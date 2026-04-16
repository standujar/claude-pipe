import { handleAnthropicMessages } from "./anthropic";
import { handleOpenAICompletions } from "./openai";
import { MODELS } from "./claude";

const PORT = Number(process.env.PORT ?? 4523);
const HOST = process.env.HOST ?? "127.0.0.1";

function handleModels(): Response {
  return Response.json({
    object: "list",
    data: MODELS.map((id) => ({
      id,
      object: "model",
      created: 0,
      owned_by: "anthropic",
    })),
  });
}

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    if (url.pathname === "/v1/models" && req.method === "GET") {
      return handleModels();
    }

    if (url.pathname === "/v1/messages" && req.method === "POST") {
      return handleAnthropicMessages(req);
    }

    if (url.pathname === "/v1/chat/completions" && req.method === "POST") {
      return handleOpenAICompletions(req);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`
  claude-pipe

  Listening on http://${HOST}:${PORT}

  Anthropic API:  POST /v1/messages
  OpenAI API:     POST /v1/chat/completions
  Models:         GET  /v1/models
  Health:         GET  /health

  Usage:
    ANTHROPIC_BASE_URL=http://${HOST}:${PORT} your-tool
    OPENAI_BASE_URL=http://${HOST}:${PORT}/v1 your-tool
`);
