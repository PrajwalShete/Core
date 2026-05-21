import { useEffect, useRef, useState } from 'react';
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

  // Auto-grow up to ~6 lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [value]);

  // Focus on mount when asked (mobile sheet). On iOS, focusing from a user
  // gesture-derived effect *should* trigger the keyboard.
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    const t = value.trim();
    if (!t || isStreaming || disabled) return;
    onSend(t);
    setValue('');
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
          placeholder="Ask Core…"
          className={cn(
            'min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5',
            'text-[0.88rem] leading-[1.4] text-ink placeholder:text-ink-quiet',
            'border border-rule outline-none focus:border-ink/40',
            'transition-colors',
          )}
        />
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
      <div className="mt-1.5 px-2 text-[0.55rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase">
        ⏎ send · ⇧⏎ newline
      </div>
    </div>
  );
}
