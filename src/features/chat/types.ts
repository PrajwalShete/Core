export type Role = 'user' | 'assistant' | 'tool' | 'system';

export interface StoredToolCall {
  name: string;
  args: Record<string, unknown>;
}
export interface StoredToolResult {
  name: string;
  result: { ok: boolean; data?: unknown; error?: string };
}

export interface ChatMessage {
  id: string;
  created_at: string;
  role: Role;
  content: string;
  model?: string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  tool_calls?: StoredToolCall[] | null;
  tool_results?: StoredToolResult[] | null;
}
