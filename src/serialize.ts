import type { AnthropicMessage, OpenAIMessage } from "./types";

/**
 * Serialize Anthropic messages[] into a single prompt string for `claude -p`.
 * Returns { prompt, system } where system is extracted from the request.
 */
export function serializeAnthropicMessages(
  messages: AnthropicMessage[],
  system?: string,
): { prompt: string; system: string | undefined } {
  if (messages.length === 1 && messages[0].role === "user") {
    const content = messages[0].content;
    const text =
      typeof content === "string"
        ? content
        : content
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("\n");
    return { prompt: text, system };
  }

  const parts: string[] = [];
  for (const msg of messages) {
    const text =
      typeof msg.content === "string"
        ? msg.content
        : msg.content
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("\n");
    const tag = msg.role === "user" ? "human" : "assistant";
    parts.push(`<${tag}>\n${text}\n</${tag}>`);
  }
  return { prompt: parts.join("\n\n"), system };
}

/**
 * Serialize OpenAI messages[] into a single prompt + system for `claude -p`.
 */
export function serializeOpenAIMessages(messages: OpenAIMessage[]): {
  prompt: string;
  system: string | undefined;
} {
  const systemParts: string[] = [];
  const convParts: string[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemParts.push(msg.content);
    } else if (msg.role === "user") {
      convParts.push(`<human>\n${msg.content}\n</human>`);
    } else if (msg.role === "assistant") {
      convParts.push(`<assistant>\n${msg.content}\n</assistant>`);
    }
  }

  const system = systemParts.length > 0 ? systemParts.join("\n") : undefined;

  if (
    convParts.length === 1 &&
    messages.filter((m) => m.role === "user").length === 1
  ) {
    const userMsg = messages.find((m) => m.role === "user")!;
    return { prompt: userMsg.content, system };
  }

  return { prompt: convParts.join("\n\n"), system };
}
