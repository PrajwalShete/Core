import { useEffect, useRef, useState } from 'react';

/**
 * Watches an `updated_at`-bearing array and returns the IDs of rows that
 * were just touched (updated within the last `windowMs` milliseconds since
 * we last saw them). Items pass through a "flash" state for ~1.5s after
 * their updated_at advances, so the UI can briefly accent them.
 */
export function useTaskFlash<T extends { id: string; updated_at?: string }>(
  rows: T[] | undefined,
  windowMs = 1500,
): Set<string> {
  const [flashing, setFlashing] = useState<Set<string>>(() => new Set());
  const seen = useRef<Map<string, string>>(new Map());
  const timers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!rows) return;
    const next = new Set(flashing);
    for (const r of rows) {
      const prev = seen.current.get(r.id);
      // First time we see this row, remember its updated_at without flashing.
      if (prev === undefined) {
        seen.current.set(r.id, r.updated_at ?? '');
        continue;
      }
      if (r.updated_at && r.updated_at !== prev) {
        seen.current.set(r.id, r.updated_at);
        next.add(r.id);
        const existing = timers.current.get(r.id);
        if (existing) window.clearTimeout(existing);
        const handle = window.setTimeout(() => {
          setFlashing((cur) => {
            const c = new Set(cur);
            c.delete(r.id);
            return c;
          });
          timers.current.delete(r.id);
        }, windowMs);
        timers.current.set(r.id, handle);
      }
    }
    if (next.size !== flashing.size) setFlashing(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  useEffect(
    () => () => {
      for (const h of timers.current.values()) window.clearTimeout(h);
    },
    [],
  );

  return flashing;
}
