import { bucketOf } from '../bucketing';
import type { Task } from '../types';
import { fmtCountdown, fmtTimeOfDay } from '@/shared/lib/time';
import { greeting } from '@/shared/lib/greeting';
import { useNow } from '@/shared/hooks/useNow';
import { cn } from '@/shared/lib/cn';

interface Props {
  task: Task | null;
  now: Date;
  onOpen: (task: Task) => void;
  /** Empty-state context, used for the time-aware greeting line. */
  emptyContext?: {
    counts: { today: number; done: number; overdue: number; ahead: number };
  };
}

export function Hero({ task, now, onOpen, emptyContext }: Props) {
  if (!task) {
    const g = greeting({
      now,
      counts: emptyContext?.counts ?? { today: 0, done: 0, overdue: 0, ahead: 0 },
    });
    return (
      <section className="panel panel-ticks shrink-0">
        <div className="panel-head">
          <span className="panel-eyebrow">Standing by</span>
          <span className="panel-badge">— —</span>
        </div>
        <div className="px-4 py-4 md:px-5 md:py-5">
          <div className="text-[clamp(1.5rem,3.4vw,3rem)] leading-[1.02] font-bold tracking-[-0.04em] text-ink">
            {g.salute}
          </div>
          <div className="mt-2 text-[0.92rem] font-medium tracking-[-0.005em] text-ink-soft">
            {g.line}
          </div>
        </div>
      </section>
    );
  }

  const due = new Date(task.due_at);
  // Live-tick the countdown text at 1 Hz independently of the parent's
  // 60s re-bucket cadence. The countdown feels alive without re-running
  // expensive bucketing every second.
  const fastNow = useNow(1000);
  const bucket = bucketOf(due, now);
  const kicker =
    bucket === 'overdue'
      ? 'Overdue'
      : bucket === 'today'
        ? 'Next up'
        : bucket === 'tomorrow'
          ? 'Tomorrow'
          : 'Coming up';
  const countdown = fmtCountdown(due, task.is_all_day, bucket, fastNow);
  const timeStr = !task.is_all_day ? fmtTimeOfDay(due) : null;

  return (
    <section className="panel panel-ticks scan shrink-0">
      <div className="panel-head">
        <span className={cn('panel-eyebrow', bucket === 'overdue' && 'text-accent')}>
          {kicker}
        </span>
        <span className="panel-badge">
          {task.tag ?? 'task'} <span className="text-ink-quiet/60">·</span> {task.type}
        </span>
      </div>
      <div className="px-4 py-4 md:px-5 md:py-5">
        <button
          type="button"
          onClick={() => onOpen(task)}
          className={cn(
            // Smaller floor for phones, same desktop ceiling.
            'block w-full cursor-pointer text-left text-[clamp(1.5rem,6.4vw,3.4rem)] leading-[1.04] font-bold tracking-[-0.04em] text-ink',
            task.is_done && 'opacity-35 decoration-[3px] line-through',
          )}
        >
          {task.title}
        </button>
        <div className="mt-3 flex items-baseline gap-3 text-[0.92rem] font-medium tracking-[-0.005em] text-accent tabular-nums">
          <span>{countdown}</span>
          {timeStr && (
            <>
              <span className="text-ink-quiet/70">·</span>
              <span className="text-ink">{timeStr}</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
