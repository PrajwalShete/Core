import { supabase } from '@/shared/lib/supabase';
import type { ChatMessage } from './types';

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** Load the entire chat thread, oldest first. */
export async function fetchHistory(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id,created_at,role,content,model,tokens_in,tokens_out')
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((m) => ({
    ...m,
    // `content` is jsonb; the Edge Function persists plain text strings,
    // but defensively coerce in case a richer block shape sneaks in.
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }));
}

interface StreamArgs {
  messages: { role: 'user' | 'assistant'; content: string }[];
  /** Called for every text delta from the SSE stream. */
  onDelta: (chunk: string) => void;
  /** Called once when the stream completes successfully. */
  onDone?: () => void;
  /** Called if the upstream returns an error frame or HTTP non-2xx. */
  onError?: (msg: string) => void;
  signal?: AbortSignal;
}

/**
 * POST to /functions/v1/chat and stream `response.output_text.delta` chunks
 * via the provided callback. Returns the accumulated text.
 */
export async function streamChat(args: StreamArgs): Promise<string> {
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
    throw new Error(text || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let acc = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split('\n')) {
        const m = line.match(/^data:\s*(.*)$/);
        if (!m || m[1] === '[DONE]') continue;
        try {
          const obj = JSON.parse(m[1]) as { type?: string; delta?: string };
          if (obj.type === 'response.output_text.delta' && typeof obj.delta === 'string') {
            acc += obj.delta;
            args.onDelta(obj.delta);
          }
        } catch {
          /* non-JSON SSE frame — ignore */
        }
      }
    }
  }
  args.onDone?.();
  return acc;
}
