import type { ClaudeOptions } from "./claude";
import { spawnClaude, runClaude } from "./claude";
import { serializeOpenAIMessages } from "./serialize";
import type { OpenAIRequest, OpenAIResponse, OpenAIStreamChunk } from "./types";

function mapStopReason(reason: string): "stop" | "length" {
  return reason === "max_tokens" ? "length" : "stop";
}

function buildClaudeOptions(
  body: OpenAIRequest,
  prompt: string,
  system: string | undefined,
): ClaudeOptions {
  return {
    prompt,
    model: body.model,
    system,
  };
}

/**
 * Handle POST /v1/chat/completions — OpenAI Chat Completions API.
 */
export async function handleOpenAICompletions(req: Request): Promise<Response> {
  let body: OpenAIRequest;
  try {
    body = (await req.json()) as OpenAIRequest;
  } catch {
    return Response.json(
      {
        error: { message: "Invalid JSON body", type: "invalid_request_error" },
      },
      { status: 400 },
    );
  }

  if (!body.model || !body.messages?.length) {
    return Response.json(
      {
        error: {
          message: "model and messages are required",
          type: "invalid_request_error",
        },
      },
      { status: 400 },
    );
  }

  const { prompt, system } = serializeOpenAIMessages(body.messages);

  const ts = new Date().toISOString();
  console.log(
    `[${ts}] POST /v1/chat/completions model=${body.model} stream=${!!body.stream}`,
  );

  const opts = buildClaudeOptions(body, prompt, system);

  if (body.stream) {
    return handleStreaming(opts);
  }
  return handleNonStreaming(opts);
}

function handleStreaming(opts: ClaudeOptions): Response {
  const id = `chatcmpl-${crypto.randomUUID().slice(0, 12)}`;
  const created = Math.floor(Date.now() / 1000);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) =>
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      let sentRole = false;

      try {
        for await (const event of spawnClaude(opts)) {
          if (event.type !== "stream_event" || !("event" in event)) continue;
          const sse = event.event as {
            type: string;
            delta?: { type: string; text?: string; stop_reason?: string };
          };

          if (
            sse.type === "content_block_delta" &&
            sse.delta?.type === "text_delta" &&
            sse.delta.text
          ) {
            if (!sentRole) {
              const roleChunk: OpenAIStreamChunk = {
                id,
                object: "chat.completion.chunk",
                created,
                model: opts.model,
                choices: [
                  {
                    index: 0,
                    delta: { role: "assistant" },
                    finish_reason: null,
                  },
                ],
              };
              send(JSON.stringify(roleChunk));
              sentRole = true;
            }

            const chunk: OpenAIStreamChunk = {
              id,
              object: "chat.completion.chunk",
              created,
              model: opts.model,
              choices: [
                {
                  index: 0,
                  delta: { content: sse.delta.text },
                  finish_reason: null,
                },
              ],
            };
            send(JSON.stringify(chunk));
          }

          if (sse.type === "message_delta") {
            const stopReason = (sse.delta as { stop_reason?: string })
              ?.stop_reason;
            const finalChunk: OpenAIStreamChunk = {
              id,
              object: "chat.completion.chunk",
              created,
              model: opts.model,
              choices: [
                {
                  index: 0,
                  delta: {},
                  finish_reason: mapStopReason(stopReason ?? "end_turn"),
                },
              ],
            };
            send(JSON.stringify(finalChunk));
          }
        }
      } catch {
        // stream ended
      } finally {
        send("[DONE]");
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

async function handleNonStreaming(opts: ClaudeOptions): Promise<Response> {
  try {
    const { events } = await runClaude(opts);

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

    if (!resultEvent) {
      return Response.json(
        {
          error: { message: "No response from Claude CLI", type: "api_error" },
        },
        { status: 500 },
      );
    }

    const usage = resultEvent.modelUsage
      ? Object.values(resultEvent.modelUsage)[0]
      : undefined;

    const response: OpenAIResponse = {
      id: `chatcmpl-${crypto.randomUUID().slice(0, 12)}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: opts.model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: resultEvent.result },
          finish_reason: mapStopReason(resultEvent.stop_reason ?? "end_turn"),
        },
      ],
      usage: {
        prompt_tokens: usage?.inputTokens ?? 0,
        completion_tokens: usage?.outputTokens ?? 0,
        total_tokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
      },
    };

    return Response.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: { message, type: "api_error" } },
      { status: 500 },
    );
  }
}
