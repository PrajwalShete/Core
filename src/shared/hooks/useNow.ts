import { useEffect, useState } from 'react';

/**
 * Returns a Date that updates at the given interval. Defaults to once per
 * second (for the clock). Pass a larger interval to throttle re-renders.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
