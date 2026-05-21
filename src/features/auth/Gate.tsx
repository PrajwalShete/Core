import { useEffect, useRef, useState, type ReactNode } from 'react';

const STEP_1 = import.meta.env.VITE_APP_PASS_STEP_1 ?? '';
const STEP_2 = import.meta.env.VITE_APP_PASS_STEP_2 ?? '';

type Stage = 'step1' | 'step2' | 'unlocked';

interface Props {
  children: ReactNode;
}

export function Gate({ children }: Props) {
  const [stage, setStage] = useState<Stage>('step1');
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [stage]);

  if (stage === 'unlocked') return <>{children}</>;

  const expected = stage === 'step1' ? STEP_1 : STEP_2;
  const prompt = stage === 'step1' ? 'Enter passcode' : 'And again';

  const check = (next: string) => {
    if (!expected) return; // env not loaded yet
    if (next === expected) {
      setError(false);
      setValue('');
      setStage(stage === 'step1' ? 'step2' : 'unlocked');
    } else {
      setError(true);
      // brief delay so the user sees their wrong digits before they vanish
      setTimeout(() => {
        setValue('');
        inputRef.current?.focus();
      }, 180);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-bg px-6 pt-safe pb-safe">
      <div className="text-[0.7rem] font-semibold tracking-[0.26em] text-ink-soft uppercase">
        {prompt}
      </div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={`h-1 w-12 ${stage === 'step1' ? 'bg-ink' : 'bg-rule'}`}
        />
        <span
          aria-hidden
          className={`h-1 w-12 ${stage === 'step2' ? 'bg-ink' : 'bg-rule'}`}
        />
      </div>
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={expected.length || 8}
        value={value}
        onChange={(e) => {
          // digits only, truncated to the expected length
          const cap = expected.length || 8;
          const digits = e.target.value.replace(/\D/g, '').slice(0, cap);
          setValue(digits);
          setError(false);
          // auto-submit the moment we have a full-length code
          if (expected && digits.length === expected.length) {
            check(digits);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            check(value);
          }
        }}
        className={`w-56 border-0 border-b-2 bg-transparent pb-2 text-center text-[1.8rem] font-light tracking-[0.4em] text-ink tabular-nums outline-none transition-colors ${
          error ? 'border-accent' : 'border-rule focus:border-ink'
        }`}
      />
      <div
        className={`text-[0.7rem] font-semibold tracking-[0.18em] uppercase ${error ? 'text-accent' : 'text-transparent'}`}
        aria-live="polite"
      >
        {error ? 'Try again' : 'placeholder'}
      </div>
    </div>
  );
}
