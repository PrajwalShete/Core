import { useEffect, useState } from 'react';

/**
 * Periodically ping the Supabase REST endpoint and report round-trip time.
 * Cheap HEAD-style request that bypasses the JS client overhead.
 */
export function useLatency(intervalMs = 8000): {
  rtt: number | null;
  status: 'ok' | 'slow' | 'down' | 'pending';
} {
  const [rtt, setRtt] = useState<number | null>(null);
  const [status, setStatus] = useState<'ok' | 'slow' | 'down' | 'pending'>('pending');

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (!url || !anon) {
      setStatus('down');
      return;
    }

    let cancelled = false;

    const ping = async () => {
      const t0 = performance.now();
      try {
        // Lightweight: fetch the REST root with the anon key. Returns 200
        // OpenAPI quickly. AbortController guards against hangs.
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`${url}/rest/v1/`, {
          method: 'GET',
          headers: { apikey: anon },
          signal: ctrl.signal,
          cache: 'no-store',
        });
        clearTimeout(timer);
        const elapsed = Math.round(performance.now() - t0);
        if (cancelled) return;
        if (!res.ok) {
          setStatus('down');
          setRtt(elapsed);
          return;
        }
        setRtt(elapsed);
        setStatus(elapsed > 600 ? 'slow' : 'ok');
      } catch {
        if (cancelled) return;
        setStatus('down');
      }
    };

    ping();
    const t = setInterval(ping, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [intervalMs]);

  return { rtt, status };
}
