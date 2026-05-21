import { useEffect, useState } from 'react';
import { emit } from '@/shared/lib/events';

const KEY = 'core_focus_until';

interface FocusState {
  endsAt: number | null;
  remainingMs: number;
  isActive: boolean;
}

/** Read + tick the current focus session. Persists to localStorage so
 *  refresh / nav doesn't lose the session. Fires a "success" sound at
 *  completion. */
export function useFocus(): FocusState & {
  start: (minutes: number) => void;
  stop: () => void;
} {
  const [endsAt, setEndsAt] = useState<number | null>(() => {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const n = Number(raw);
    if (Number.isNaN(n) || n <= Date.now()) return null;
    return n;
  });
  const [now, setNow] = useState(Date.now());

  // Always tick — focus may start from another component via the
  // /focus chat command writing to localStorage.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Subscribe to localStorage changes (same tab uses custom dispatch).
  useEffect(() => {
    const onStorage = () => {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        setEndsAt(null);
        return;
      }
      const n = Number(raw);
      setEndsAt(Number.isNaN(n) || n <= Date.now() ? null : n);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Detect completion.
  useEffect(() => {
    if (!endsAt) return;
    if (now >= endsAt) {
      localStorage.removeItem(KEY);
      setEndsAt(null);
      emit('play-sound', { kind: 'success' });
      // Desktop notification when the tab is hidden — Core lets you know.
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted' &&
        document.visibilityState === 'hidden'
      ) {
        try {
          new Notification('Focus complete', {
            body: 'The session has finished. Welcome back.',
            icon: '/favicon.svg',
            tag: 'core-focus',
            silent: false,
          });
        } catch {
          /* ignore notification failures */
        }
      }
    }
  }, [now, endsAt]);

  const start = (minutes: number) => {
    const m = Math.max(1, Math.min(180, Math.round(minutes)));
    const end = Date.now() + m * 60_000;
    localStorage.setItem(KEY, String(end));
    setEndsAt(end);
    emit('play-sound', { kind: 'open' });
    // Request notification permission once — no harm if user denies.
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        void Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }
  };

  const stop = () => {
    localStorage.removeItem(KEY);
    setEndsAt(null);
  };

  return {
    endsAt,
    remainingMs: endsAt ? Math.max(0, endsAt - now) : 0,
    isActive: !!endsAt && endsAt > now,
    start,
    stop,
  };
}
