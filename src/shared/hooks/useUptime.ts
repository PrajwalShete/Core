import { useEffect, useState } from 'react';

/** Boot start time — captured once, lives module-scope so refreshes inside
 *  the same tab give a continuous uptime read. */
let bootedAt = Date.now();
try {
  const stored = sessionStorage.getItem('core_booted_at');
  if (stored) {
    bootedAt = Number(stored);
  } else {
    sessionStorage.setItem('core_booted_at', String(bootedAt));
  }
} catch {
  /* SSR or storage blocked — fall back to module-scope value */
}

export function useUptime(): string {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Date.now() - bootedAt;
  return formatUptime(ms);
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
