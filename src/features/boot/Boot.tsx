import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/** Boot lines streamed onto the screen between gate-unlock and dashboard. */
const STAGES = [
  { label: 'Vitals', value: 'nominal' },
  { label: 'Uplink', value: 'chatgpt · codex · gpt-5.4' },
  { label: 'Realtime', value: 'supabase · ap-south-1' },
  { label: 'Telemetry', value: 'ready' },
  { label: 'Core', value: 'online' },
] as const;

interface Props {
  /** Skip the sequence and call onDone immediately (used by tests / quick paths). */
  instant?: boolean;
  /** Called when the sequence finishes. */
  onDone: () => void;
  children?: ReactNode;
}

/**
 * A brief "JARVIS coming online" sequence between gate unlock and the
 * dashboard. Five lines stream on, each with a typed value, then a final
 * "READY" punch, then we fade and hand off.
 */
export function Boot({ onDone, instant }: Props) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'streaming' | 'ready' | 'fade'>('streaming');

  useEffect(() => {
    if (instant) {
      onDone();
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      if (i > STAGES.length) {
        clearInterval(interval);
        setPhase('ready');
        // ready punch holds for 320ms, then fade for 280ms, then we're done
        setTimeout(() => setPhase('fade'), 320);
        setTimeout(() => onDone(), 600);
        return;
      }
      setStep(i);
    }, 140);
    return () => clearInterval(interval);
  }, [instant, onDone]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-bg transition-opacity',
        phase === 'fade' ? 'opacity-0 duration-300' : 'opacity-100 duration-0',
      )}
    >
      {/* corner ticks like a panel for cinematic framing */}
      <div className="absolute top-4 left-4 size-3 border-t border-l border-ink-quiet" />
      <div className="absolute top-4 right-4 size-3 border-t border-r border-ink-quiet" />
      <div className="absolute bottom-4 left-4 size-3 border-b border-l border-ink-quiet" />
      <div className="absolute bottom-4 right-4 size-3 border-b border-r border-ink-quiet" />

      <div className="flex w-[min(420px,86vw)] flex-col gap-5">
        {/* heading */}
        <div className="flex items-center gap-2">
          <span aria-hidden className="pulse-dot signal" />
          <span className="text-[0.62rem] font-semibold tracking-[0.32em] text-ink-soft uppercase">
            Core / Online
          </span>
        </div>

        {/* streaming stage lines */}
        <div className="flex flex-col gap-1.5 font-mono tabular-nums">
          {STAGES.map((s, i) => {
            const active = i < step;
            return (
              <div
                key={s.label}
                className={cn(
                  'flex items-center justify-between text-[0.74rem] tracking-[0.06em] transition-colors duration-200',
                  active ? 'text-ink' : 'text-ink-quiet/40',
                )}
              >
                <span className="uppercase">
                  {active ? '◆' : '◇'} {s.label}
                </span>
                <span className={cn(active ? 'text-ink-soft' : 'text-ink-quiet/40')}>
                  {active ? s.value : '— — — —'}
                </span>
              </div>
            );
          })}
        </div>

        {/* ready stamp */}
        <div
          className={cn(
            'mt-3 border-t border-rule pt-3 transition-opacity duration-200',
            phase === 'ready' ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="flex items-baseline justify-between text-[0.7rem] font-semibold tracking-[0.28em] text-accent uppercase">
            <span>Ready</span>
            <span className="font-mono tabular-nums text-ink">{stamp()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function stamp(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
