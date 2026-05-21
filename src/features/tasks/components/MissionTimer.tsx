import { useNow } from '@/shared/hooks/useNow';
import type { Task } from '../types';
import { cn } from '@/shared/lib/cn';

interface Props {
  /** Sorted exam tasks (asc by due_at). */
  exams: Task[];
  /** Optional callback when the timer is tapped — opens the task. */
  onOpen?: (task: Task) => void;
}

/**
 * "T-minus" countdown to the next not-yet-passed exam. Lives in a compact
 * panel that ticks live every second. Pure cockpit chrome.
 */
export function MissionTimer({ exams, onOpen }: Props) {
  const now = useNow(1000);
  const next = exams.find((e) => e.type === 'exam' && new Date(e.due_at) >= now);
  if (!next) return null;

  const due = new Date(next.due_at);
  const ms = due.getTime() - now.getTime();
  const { dd, hh, mm, ss } = decompose(ms);
  const subject = next.subject ?? next.title;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(next)}
      className="panel panel-ticks flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:border-rule-strong"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="pulse-dot" />
        <div>
          <div className="text-[0.55rem] font-semibold tracking-[0.28em] text-ink-soft uppercase">
            T-minus · next exam
          </div>
          <div className="mt-0.5 text-[0.78rem] font-medium tracking-[-0.005em] text-ink">
            <span className="text-accent">{subject}</span>
            <span className="mx-2 text-ink-quiet/70">·</span>
            <span className="text-ink-soft">
              {due.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-baseline gap-1 font-mono tabular-nums">
        <Group value={dd} label="d" />
        <span className="text-ink-quiet">:</span>
        <Group value={hh} label="h" />
        <span className="text-ink-quiet">:</span>
        <Group value={mm} label="m" />
        <span className="text-ink-quiet">:</span>
        <Group value={ss} label="s" highlight />
      </div>
    </button>
  );
}

function Group({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span
        className={cn(
          'text-[1rem] leading-none font-semibold tracking-[-0.02em]',
          highlight ? 'text-accent' : 'text-ink',
        )}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[0.55rem] font-semibold tracking-[0.18em] text-ink-quiet uppercase">
        {label}
      </span>
    </span>
  );
}

function decompose(ms: number) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const dd = Math.floor(totalSec / 86400);
  const hh = Math.floor((totalSec % 86400) / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return { dd, hh, mm, ss };
}
