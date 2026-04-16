import type { ClaudeOptions } from "./claude";
import { spawnClaude, runClaude } from "./claude";
import { serializeAnthropicMessages } from "./serialize";
import type { AnthropicRequest, AnthropicResponse } from "./types";

function makeErrorResponse(
  status: number,
  type: string,
  message: string,
): Response {
  return Response.json({ type: "error", error: { type, message } }, { status });
}

function mapThinkingToEffort(
  thinking: AnthropicRequest["thinking"],
): ClaudeOptions["effort"] {
  if (!thinking) return undefined;
  if (thinking.type === "disabled") return "low";
  if (thinking.type === "enabled") {
    const budget = thinking.budget_tokens ?? 0;
    if (budget <= 4096) return "medium";
    if (budget <= 16384) return "high";
    return "max";
  }
  return undefined;
}

function buildClaudeOptions(
  body: AnthropicRequest,
  prompt: string,
  system: string | undefined,
): ClaudeOptions {
  const hasWebSearch = body.tools?.some((t) => t.type.startsWith("web_search"));
  return {
    prompt,
    model: body.model,
    system,
    effort: mapThinkingToEffort(body.thinking),
    webSearch: hasWebSearch,
  };
}

/**
 * Handle POST /v1/messages — Anthropic Messages API.
 */
export async function handleAnthropicMessages(req: Request): Promise<Response> {
  let body: AnthropicRequest;
  try {
    body = await req.json();
  } catch {
    return makeErrorResponse(400, "invalid_request_error", "Invalid JSON body");
  }

  if (!body.model || !body.messages?.length) {
    return makeErrorResponse(
      400,
      "invalid_request_error",
      "model and messages are required",
    );
  }

  const { prompt, system } = serializeAnthropicMessages(
    body.messages,
    body.system,
  );

  const ts = new Date().toISOString();
  console.log(
    `[${ts}] POST /v1/messages model=${body.model} stream=${!!body.stream}`,
  );

  const opts = buildClaudeOptions(body, prompt, system);

  if (body.stream) {
    return handleStreaming(opts);
  }
  return handleNonStreaming(opts, body.model);
}

function handleStreaming(opts: ClaudeOptions): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (eventType: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(
            `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`,
          ),
        );
      };

      try {
        for await (const event of spawnClaude(opts)) {
          if (event.type === "stream_event" && "event" in event) {
            const sseEvent = event.event as { type: string };
            send(sseEvent.type, sseEvent);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send("error", { type: "error", error: { type: "api_error", message } });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

async function handleNonStreaming(
  opts: ClaudeOptions,
  requestModel: string,
): Promise<Response> {
  try {
    const { events } = await runClaude(opts);

    const assistantEvents = events.filter((e) => e.type === "assistant") as {
      type: "assistant";
      message: AnthropicResponse;
    }[];
    const assistantEvent = assistantEvents[assistantEvents.length - 1];

    const resultEvent = events.find((e) => e.type === "result") as
      | {
          type: "result";
          result: string;
          stop_reason: string;
          modelUsage: Record<
            string,
            { inputTokens: number; outputTokens: number }
          >;
        }
      | undefined;

    if (assistantEvent?.message) {
      const msg = assistantEvent.message;
      if (resultEvent) {
        msg.stop_reason =
          (resultEvent.stop_reason as AnthropicResponse["stop_reason"]) ??
          "end_turn";
        const usage = resultEvent.modelUsage
          ? Object.values(resultEvent.modelUsage)[0]
          : undefined;
        if (usage) {
          msg.usage = {
            input_tokens: usage.inputTokens,
            output_tokens: usage.outputTokens,
          };
        }
      }
      return Response.json(msg);
    }

    if (resultEvent) {
      const usage = resultEvent.modelUsage
        ? Object.values(resultEvent.modelUsage)[0]
        : undefined;

      const response: AnthropicResponse = {
        id: `msg_${crypto.randomUUID().slice(0, 12)}`,
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: resultEvent.result }],
        model: requestModel,
        stop_reason:
          (resultEvent.stop_reason as AnthropicResponse["stop_reason"]) ??
          "end_turn",
        stop_sequence: null,
        usage: {
          input_tokens: usage?.inputTokens ?? 0,
          output_tokens: usage?.outputTokens ?? 0,
        },
      };
      return Response.json(response);
    }

    return makeErrorResponse(500, "api_error", "No response from Claude CLI");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeErrorResponse(500, "api_error", message);
  }
}
