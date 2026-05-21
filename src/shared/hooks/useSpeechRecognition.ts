import { useCallback, useEffect, useRef, useState } from 'react';

/** Minimal SpeechRecognition types — the lib lacks them in some envs. */
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  type WindowWithSR = Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const w = window as WindowWithSR;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechState {
  /** Whether the browser supports speech recognition at all. */
  supported: boolean;
  /** Whether the mic is currently listening. */
  listening: boolean;
  /** Best-effort final + interim transcript since `start` was called. */
  transcript: string;
  /** Last error message, if any. */
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Push-to-talk speech recognition. Calls `onFinal` with each finalized
 * chunk so a parent (Composer) can append it to the textarea live.
 */
export function useSpeechRecognition(opts?: {
  lang?: string;
  onFinal?: (text: string) => void;
}): SpeechState {
  const Ctor = getCtor();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef('');

  const reset = useCallback(() => {
    finalRef.current = '';
    setTranscript('');
    setError(null);
  }, []);

  const start = useCallback(() => {
    if (!Ctor) {
      setError('Speech recognition not supported in this browser.');
      return;
    }
    if (recRef.current) {
      try { recRef.current.abort(); } catch { /* ignore */ }
    }
    const rec = new Ctor();
    rec.lang = opts?.lang ?? 'en-IN';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      finalRef.current = '';
      setTranscript('');
      setError(null);
      setListening(true);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onerror = (e) => {
      const ev = e as Event & { error?: string; message?: string };
      setError(ev.error || ev.message || 'speech error');
      setListening(false);
    };
    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (!r) continue;
        const text = r[0]?.transcript ?? '';
        if (r.isFinal) {
          finalRef.current += text;
          opts?.onFinal?.(text);
        } else {
          interim += text;
        }
      }
      setTranscript(finalRef.current + interim);
    };

    try {
      rec.start();
      recRef.current = rec;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [Ctor, opts]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try { rec.stop(); } catch { /* ignore */ }
  }, []);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      const rec = recRef.current;
      if (rec) {
        try { rec.abort(); } catch { /* ignore */ }
      }
    };
  }, []);

  return {
    supported: !!Ctor,
    listening,
    transcript,
    error,
    start,
    stop,
    reset,
  };
}
