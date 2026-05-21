import { useEffect, useRef, useState } from 'react';

/**
 * Tween a number toward a target over a short duration. Used by the status
 * pills so going from "03 TODAY" to "04 TODAY" feels like the count ticked,
 * not a hard cut. Falls back to instant jump if reduced motion is set.
 */
export function useAnimatedNumber(target: number, durationMs = 350): number {
  const [value, setValue] = useState(target);
  const startRef = useRef<{ from: number; to: number; t0: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === value) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setValue(target);
      return;
    }
    startRef.current = { from: value, to: target, t0: performance.now() };
    const step = (t: number) => {
      const s = startRef.current;
      if (!s) return;
      const p = Math.min(1, (t - s.t0) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      const v = s.from + (s.to - s.from) * eased;
      setValue(p === 1 ? s.to : Math.round(v));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // value is intentionally not in deps — we only re-run on target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}
