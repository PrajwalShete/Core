import { useEffect } from 'react';
import { on } from '@/shared/lib/events';
import { play } from '@/shared/lib/sounds';

/**
 * Mount once at app root. Listens for `play-sound` events globally and
 * plays the synthesized recipe. Components emit sounds via `emit('play-sound', { kind })`.
 */
export function useSoundBus(): void {
  useEffect(() => {
    return on('play-sound', (detail) => {
      if (detail?.kind) play(detail.kind);
    });
  }, []);
}
