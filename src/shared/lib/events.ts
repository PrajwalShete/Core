/**
 * Tiny app-wide event bus. We use window CustomEvents because the bus is
 * cross-component and cross-tree — palette commands need to reach both the
 * desktop sidebar and the mobile launcher without prop drilling.
 */

export type CoreEvent = 'open-chat' | 'focus-composer' | 'open-palette' | 'play-sound';

interface EventDetail {
  'open-chat': void;
  'focus-composer': void;
  'open-palette': void;
  'play-sound': { kind: 'tap' | 'success' | 'error' | 'open' | 'boot' };
}

export function emit<K extends CoreEvent>(
  name: K,
  detail?: EventDetail[K],
): void {
  window.dispatchEvent(new CustomEvent(`core:${name}`, { detail }));
}

export function on<K extends CoreEvent>(
  name: K,
  handler: (detail: EventDetail[K]) => void,
): () => void {
  const wrapped = (e: Event) =>
    handler((e as CustomEvent<EventDetail[K]>).detail);
  window.addEventListener(`core:${name}`, wrapped);
  return () => window.removeEventListener(`core:${name}`, wrapped);
}
