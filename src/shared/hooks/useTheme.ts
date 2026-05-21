import { useEffect, useState } from 'react';

const KEY = 'core_theme';

export type ThemeMode = 'system' | 'light' | 'dark';

/** Reads / writes the user theme override. The override sets a
 *  data-theme attribute on <html>, which our CSS reacts to. When the
 *  mode is "system", we delete the attribute and let the
 *  prefers-color-scheme media query take over. */
export function useTheme(): { mode: ThemeMode; setMode: (m: ThemeMode) => void; isDark: boolean } {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof localStorage === 'undefined') return 'system';
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return 'system';
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply the data-theme attribute whenever mode changes.
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'system') {
      root.removeAttribute('data-theme');
      localStorage.removeItem(KEY);
    } else {
      root.setAttribute('data-theme', mode);
      localStorage.setItem(KEY, mode);
    }
  }, [mode]);

  // Watch the system preference so isDark stays accurate when the
  // user hasn't overridden.
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setIsDark(mql.matches);
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const effectiveIsDark = mode === 'system' ? isDark : mode === 'dark';
  return { mode, setMode, isDark: effectiveIsDark };
}
