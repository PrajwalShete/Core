import { useEffect } from 'react';

export interface Shortcut {
  /** lowercase key, e.g. "k", "/", "escape", "j". */
  key: string;
  /** Optional modifier requirements. */
  meta?: boolean; // ⌘ on macOS, ⊞ on windows
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Allow this binding to fire even while an input/textarea is focused. */
  allowInInput?: boolean;
  /** Description for documentation / palette display. */
  description?: string;
  handler: (e: KeyboardEvent) => void;
}

/** Bind a list of keyboard shortcuts to the window. Cleanly unsubscribes
 *  on unmount. Skips firing when an input/textarea has focus unless the
 *  binding explicitly opts in via `allowInInput`. */
export function useShortcuts(shortcuts: Shortcut[]): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (target?.isContentEditable ?? false);

      const k = e.key.toLowerCase();
      for (const s of shortcuts) {
        if (s.key !== k) continue;
        if (!s.allowInInput && isEditable) continue;
        if ((s.meta ?? false) !== e.metaKey) continue;
        if ((s.ctrl ?? false) !== e.ctrlKey) continue;
        if ((s.shift ?? false) !== e.shiftKey) continue;
        if ((s.alt ?? false) !== e.altKey) continue;
        e.preventDefault();
        s.handler(e);
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts]);
}
