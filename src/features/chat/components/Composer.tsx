import { useEffect, useRef, useState } from 'react';
import { useSpeechRecognition } from '@/shared/hooks/useSpeechRecognition';
import { cn } from '@/shared/lib/cn';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  /** When true, focus the textarea on mount. Used inside the mobile sheet
   *  so the keyboard appears immediately. */
  autoFocus?: boolean;
}

export function Composer({ onSend, onStop, isStreaming, disabled, autoFocus }: Props) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  // Push-to-talk dictation. Final chunks get appended to the textarea;
  // interim chunks just show in the transcript hint.
  const speech = useSpeechRecognition({
    lang: 'en-IN',
    onFinal: (text) => {
      setValue((v) => (v ? v + ' ' : '') + text.trim());
    },
  });

  // Auto-grow up to ~6 lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    const t = value.trim();
    if (!t || isStreaming || disabled) return;
    onSend(t);
    setValue('');
    if (speech.listening) speech.stop();
  };

  const toggleMic = () => {
    if (speech.listening) {
      speech.stop();
    } else {
      speech.reset();
      speech.start();
    }
  };

  return (
    <div className="border-t border-rule p-2.5">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={speech.listening ? 'Listening…' : 'Ask Core…'}
          className={cn(
            'min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5',
            'text-[0.88rem] leading-[1.4] text-ink placeholder:text-ink-quiet',
            'border border-rule outline-none focus:border-ink/40',
            'transition-colors',
            speech.listening && 'border-accent/60',
          )}
        />

        {speech.supported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled || isStreaming}
            title={speech.listening ? 'Stop dictation' : 'Push to talk'}
            className={cn(
              'flex h-[2.25rem] w-[2.25rem] cursor-pointer items-center justify-center border transition-colors',
              speech.listening
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-rule text-ink-soft hover:border-ink hover:text-ink',
              (disabled || isStreaming) && 'cursor-not-allowed opacity-50',
            )}
          >
            <MicGlyph listening={speech.listening} />
          </button>
        )}

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="h-[2.25rem] cursor-pointer border border-accent px-3 text-[0.7rem] font-semibold tracking-[0.18em] text-accent uppercase hover:bg-accent/10"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || disabled}
            className={cn(
              'h-[2.25rem] cursor-pointer border px-3 text-[0.7rem] font-semibold tracking-[0.18em] uppercase transition-colors',
              value.trim() && !disabled
                ? 'border-ink text-ink hover:bg-ink hover:text-bg'
                : 'border-rule text-ink-quiet',
            )}
          >
            Send
          </button>
        )}
      </div>

      {/* live interim transcript while dictating */}
      {speech.listening && speech.transcript && (
        <div className="mt-1.5 px-2 text-[0.72rem] tracking-[-0.005em] text-ink-soft italic">
          “{speech.transcript}”
        </div>
      )}
      {speech.error && (
        <div className="mt-1.5 px-2 text-[0.6rem] font-semibold tracking-[0.22em] text-accent uppercase">
          {speech.error}
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between px-2 text-[0.55rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase">
        <span>⏎ send · ⇧⏎ newline</span>
        <span>/clear · /focus N</span>
      </div>
    </div>
  );
}

function MicGlyph({ listening }: { listening: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={listening ? 'animate-pulse' : undefined}
    >
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M5 11v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
