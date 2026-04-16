import type { CliEvent } from "./types";

export const MODELS = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  "claude-sonnet-4-5",
  "claude-opus-4-5",
  "claude-opus-4-1",
];

const MODEL_ALIASES: Record<string, string> = {
  // Short aliases → latest
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-6",
  haiku: "claude-haiku-4-5",
  // Version aliases
  "sonnet-4.6": "claude-sonnet-4-6",
  "sonnet-4.5": "claude-sonnet-4-5",
  "opus-4.6": "claude-opus-4-6",
  "opus-4.5": "claude-opus-4-5",
  "opus-4.1": "claude-opus-4-1",
  // OpenAI compat
  "gpt-4": "claude-sonnet-4-6",
  "gpt-4o": "claude-sonnet-4-6",
  "gpt-4o-mini": "claude-haiku-4-5",
};

export function resolveModel(model: string): string {
  return MODEL_ALIASES[model] ?? model;
}

export interface ClaudeOptions {
  prompt: string;
  model: string;
  system?: string;
  effort?: "low" | "medium" | "high" | "max";
  jsonSchema?: string;
  fallbackModel?: string;
  maxBudgetUsd?: number;
  webSearch?: boolean;
}

function buildArgs(opts: ClaudeOptions): string[] {
  const args = [
    "claude",
    "-p",
    opts.prompt,
    "--model",
    resolveModel(opts.model),
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--no-session-persistence",
  ];

  if (opts.webSearch) {
    args.push("--tools", "WebSearch,WebFetch");
    args.push("--allowedTools", "WebSearch,WebFetch");
  } else {
    args.push("--tools", "");
  }

  if (opts.system) {
    args.push("--system-prompt", opts.system);
  }
  if (opts.effort) {
    args.push("--effort", opts.effort);
  }
  if (opts.jsonSchema) {
    args.push("--json-schema", opts.jsonSchema);
  }
  if (opts.fallbackModel) {
    args.push("--fallback-model", resolveModel(opts.fallbackModel));
  }
  if (opts.maxBudgetUsd != null) {
    args.push("--max-budget-usd", String(opts.maxBudgetUsd));
  }

  return args;
}

/**
 * Spawn `claude -p` and yield parsed NDJSON events as they arrive.
 */
export async function* spawnClaude(
  opts: ClaudeOptions,
): AsyncGenerator<CliEvent> {
  const args = buildArgs(opts);
  const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });

  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          yield JSON.parse(line) as CliEvent;
        } catch {
          // skip unparseable lines
        }
      }
    }
  } finally {
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(
        `claude -p exited with code ${exitCode}: ${stderr.slice(0, 500)}`,
      );
    }
  }
}

/**
 * Run `claude -p` and collect all events.
 */
export async function runClaude(
  opts: ClaudeOptions,
): Promise<{ events: CliEvent[] }> {
  const events: CliEvent[] = [];
  for await (const event of spawnClaude(opts)) {
    events.push(event);
  }
  return { events };
}
