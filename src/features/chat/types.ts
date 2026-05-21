export type Role = 'user' | 'assistant' | 'tool' | 'system';

export interface ChatMessage {
  id: string;
  created_at: string;
  role: Role;
  content: string; // we render plain text; richer blocks live in the JSON column
  model?: string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
}
