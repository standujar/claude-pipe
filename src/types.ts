// ─── Anthropic Messages API types ────────────────────────────────────────────

export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  system?: string;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  thinking?: {
    type: "enabled" | "disabled" | "adaptive";
    budget_tokens?: number;
  };
  tools?: { type: string; name?: string; [key: string]: unknown }[];
  metadata?: { user_id?: string };
}

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicContentBlock {
  type: "text" | "image" | "tool_use" | "tool_result";
  text?: string;
  [key: string]: unknown;
}

export interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | null;
  stop_sequence: string | null;
  usage: AnthropicUsage;
}

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface AnthropicError {
  type: "error";
  error: {
    type: string;
    message: string;
  };
}

// ─── OpenAI Chat Completions API types ───────────────────────────────────────

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  max_completion_tokens?: number;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  stop?: string | string[];
}

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: [
    {
      index: 0;
      message: { role: "assistant"; content: string };
      finish_reason: "stop" | "length";
    },
  ];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIStreamChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: [
    {
      index: 0;
      delta: { role?: "assistant"; content?: string };
      finish_reason: "stop" | "length" | null;
    },
  ];
}

// ─── CLI event types ─────────────────────────────────────────────────────────

export interface CliStreamEvent {
  type: "stream_event";
  event: {
    type: string;
    [key: string]: unknown;
  };
}

export interface CliResultEvent {
  type: "result";
  subtype: "success" | "error";
  is_error: boolean;
  result: string;
  stop_reason: string;
  duration_ms: number;
  duration_api_ms: number;
  usage: Record<string, unknown>;
  modelUsage: Record<string, { inputTokens: number; outputTokens: number }>;
}

export interface CliAssistantEvent {
  type: "assistant";
  message: AnthropicResponse;
}

export type CliEvent =
  | CliStreamEvent
  | CliResultEvent
  | CliAssistantEvent
  | { type: string; [key: string]: unknown };
