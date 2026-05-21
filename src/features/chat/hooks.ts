import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clearHistory, fetchHistory, streamChat, type ToolCallEvent, type ToolResultEvent } from './api';
import type { ChatMessage } from './types';

export const CHAT_KEY = ['chat-history'] as const;

export function useChatHistory() {
  return useQuery<ChatMessage[]>({
    queryKey: CHAT_KEY,
    queryFn: fetchHistory,
    staleTime: 30_000,
  });
}

export interface ToolEvent {
  call_id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'running' | 'ok' | 'error';
  error?: string;
  result?: unknown;
}

export function useChat() {
  const qc = useQueryClient();
  const { data: history = [] } = useChatHistory();
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [pendingAssistant, setPendingAssistant] = useState<string>('');
  const [pendingTools, setPendingTools] = useState<ToolEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      // ── slash commands ─────────────────────────────────────────────
      // Currently only /clear. Match case-insensitive, exact (no args).
      if (/^\/clear\s*$/i.test(trimmed)) {
        try {
          await clearHistory();
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          return;
        }
        setError(null);
        setPendingUser(null);
        setPendingAssistant('');
        setPendingTools([]);
        qc.invalidateQueries({ queryKey: CHAT_KEY });
        return;
      }

      setError(null);
      setPendingUser(trimmed);
      setPendingAssistant('');
      setPendingTools([]);
      setIsStreaming(true);

      const turns: { role: 'user' | 'assistant'; content: string }[] = [
        ...history
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: trimmed },
      ];

      abortRef.current = new AbortController();
      try {
        await streamChat({
          messages: turns,
          signal: abortRef.current.signal,
          onDelta: (chunk) => setPendingAssistant((p) => p + chunk),
          onToolCall: (e: ToolCallEvent) =>
            setPendingTools((prev) => [
              ...prev,
              { ...e, status: 'running' },
            ]),
          onToolResult: (e: ToolResultEvent) =>
            setPendingTools((prev) =>
              prev.map((t) =>
                t.call_id === e.call_id
                  ? {
                      ...t,
                      status: e.ok ? 'ok' : 'error',
                      ...(e.error ? { error: e.error } : {}),
                      ...(e.data !== undefined ? { result: e.data } : {}),
                    }
                  : t,
              ),
            ),
          onError: (msg) => setError(msg),
        });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        setIsStreaming(false);
        setPendingUser(null);
        setPendingAssistant('');
        setPendingTools([]);
        qc.invalidateQueries({ queryKey: CHAT_KEY });
        // The model may have mutated tasks/comments — refresh those too.
        qc.invalidateQueries({ queryKey: ['tasks'] });
        qc.invalidateQueries({ queryKey: ['comments'] });
      }
    },
    [history, isStreaming, qc],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    history,
    pendingUser,
    pendingAssistant,
    pendingTools,
    isStreaming,
    error,
    send,
    stop,
  };
}
