import { useEffect, useState } from 'react';

/** Subscribe to a CSS media query. Re-renders when the match state flips. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** True on screens narrower than Tailwind's `md:` breakpoint (< 768 px). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767.98px)');
}
