/**
 * Synthesized UI sounds via Web Audio API. Zero asset payload.
 * Opt-in — disabled by default; enable via the settings popover.
 *
 * Design principles:
 *  - All sounds < 240 ms.
 *  - Low volume (<= 0.15 gain) — UI, not music.
 *  - No two simultaneous notes — fast attack, fast decay.
 *  - "tap" is everywhere — must be cheap and unobtrusive.
 */

export type SoundKind = 'tap' | 'success' | 'error' | 'open' | 'boot';

const PREF_KEY = 'core_sound_enabled';

let ctx: AudioContext | null = null;
let unlocked = false;

/** Lazily create / return the audio context. */
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    type WindowWithWebkit = Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const w = window as WindowWithWebkit;
    const C = window.AudioContext ?? w.webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Browsers gate audio until a user gesture. Call this from a click handler
 *  the first time sound is enabled to "unlock" subsequent playback. */
export function unlockAudio(): void {
  const c = getCtx();
  if (!c || unlocked) return;
  if (c.state === 'suspended') void c.resume();
  unlocked = true;
}

/** Persisted user preference. */
export function isSoundEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(PREF_KEY) === '1';
}

export function setSoundEnabled(on: boolean): void {
  if (typeof localStorage === 'undefined') return;
  if (on) {
    localStorage.setItem(PREF_KEY, '1');
    unlockAudio();
  } else {
    localStorage.removeItem(PREF_KEY);
  }
}

interface Tone {
  freq: number;
  /** Duration in seconds. */
  dur: number;
  /** Peak gain (0..1). */
  gain: number;
  /** Oscillator type. */
  type?: OscillatorType;
  /** Delay before this tone, seconds. */
  delay?: number;
}

const RECIPES: Record<SoundKind, Tone[]> = {
  tap: [{ freq: 880, dur: 0.05, gain: 0.05, type: 'sine' }],
  success: [
    { freq: 660, dur: 0.06, gain: 0.08, type: 'triangle' },
    { freq: 990, dur: 0.09, gain: 0.08, type: 'triangle', delay: 0.05 },
  ],
  error: [{ freq: 220, dur: 0.18, gain: 0.1, type: 'square' }],
  open: [
    { freq: 440, dur: 0.06, gain: 0.06, type: 'sine' },
    { freq: 660, dur: 0.08, gain: 0.06, type: 'sine', delay: 0.04 },
  ],
  boot: [
    { freq: 330, dur: 0.08, gain: 0.06, type: 'sine' },
    { freq: 494, dur: 0.08, gain: 0.06, type: 'sine', delay: 0.07 },
    { freq: 740, dur: 0.12, gain: 0.07, type: 'sine', delay: 0.16 },
  ],
};

export function play(kind: SoundKind): void {
  if (!isSoundEnabled()) return;
  const c = getCtx();
  if (!c) return;
  const tones = RECIPES[kind];
  const t0 = c.currentTime;
  for (const t of tones) {
    const start = t0 + (t.delay ?? 0);
    const end = start + t.dur;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = t.type ?? 'sine';
    osc.frequency.setValueAtTime(t.freq, start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(t.gain, start + Math.min(0.01, t.dur / 2));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(g).connect(c.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}
