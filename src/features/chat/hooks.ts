import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHistory, streamChat } from './api';
import type { ChatMessage } from './types';

export const CHAT_KEY = ['chat-history'] as const;

export function useChatHistory() {
  return useQuery<ChatMessage[]>({
    queryKey: CHAT_KEY,
    queryFn: fetchHistory,
    staleTime: 30_000,
  });
}

/**
 * Send a user message and stream the assistant reply. While streaming, an
 * in-memory "pending" assistant bubble is exposed so the UI can render the
 * tokens as they arrive. Once the stream completes, we re-fetch the
 * canonical history from the DB.
 */
export function useChat() {
  const qc = useQueryClient();
  const { data: history = [] } = useChatHistory();
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [pendingAssistant, setPendingAssistant] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      setError(null);
      setPendingUser(trimmed);
      setPendingAssistant('');
      setIsStreaming(true);

      // Build the full message log to send: prior history + the new user turn.
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
        // canonical history (including the persisted assistant turn) lives in
        // the DB — refetch once the stream is done.
        qc.invalidateQueries({ queryKey: CHAT_KEY });
      }
    },
    [history, isStreaming, qc],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { history, pendingUser, pendingAssistant, isStreaming, error, send, stop };
}
