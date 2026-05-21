import { supabase } from '@/shared/lib/supabase';
import type { ChatMessage } from './types';

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** Wipe the entire chat thread. PostgREST requires a filter on bulk delete,
 *  so we use an "always true" filter on created_at. */
export async function clearHistory(): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .gte('created_at', '1970-01-01');
  if (error) throw error;
}

/** Load the entire chat thread, oldest first. */
export async function fetchHistory(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id,created_at,role,content,model,tokens_in,tokens_out,tool_calls,tool_results')
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((m) => ({
    ...m,
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }));
}

export interface ToolCallEvent {
  call_id: string;
  name: string;
  args: Record<string, unknown>;
}
export interface ToolResultEvent {
  call_id: string;
  name: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

interface StreamArgs {
  messages: { role: 'user' | 'assistant'; content: string }[];
  onDelta: (chunk: string) => void;
  onToolCall?: (e: ToolCallEvent) => void;
  onToolResult?: (e: ToolResultEvent) => void;
  onDone?: () => void;
  onError?: (msg: string) => void;
  signal?: AbortSignal;
}

/** POST to /functions/v1/chat and dispatch the custom SSE events
 *  (delta, tool_call, tool_result, done, error). */
export async function streamChat(args: StreamArgs): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages: args.messages }),
    signal: args.signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    args.onError?.(text || `HTTP ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);

      let evt = 'message';
      let data = '';
      for (const line of frame.split('\n')) {
        const e = line.match(/^event:\s*(.*)$/);
        const d = line.match(/^data:\s*(.*)$/);
        if (e) evt = e[1].trim();
        if (d) data = d[1];
      }
      if (!data) continue;

      try {
        const obj = JSON.parse(data);
        switch (evt) {
          case 'delta':
            if (typeof obj.text === 'string') args.onDelta(obj.text);
            break;
          case 'tool_call':
            args.onToolCall?.(obj as ToolCallEvent);
            break;
          case 'tool_result':
            args.onToolResult?.(obj as ToolResultEvent);
            break;
          case 'error':
            args.onError?.(String(obj.message ?? data));
            break;
          case 'done':
            args.onDone?.();
            break;
        }
      } catch {
        /* ignore */
      }
    }
  }
}
