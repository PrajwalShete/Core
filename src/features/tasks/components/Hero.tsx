import { bucketOf } from '../bucketing';
import type { Task } from '../types';
import { fmtCountdown, fmtTimeOfDay } from '@/shared/lib/time';
import { cn } from '@/shared/lib/cn';

interface Props {
  task: Task | null;
  now: Date;
  onOpen: (task: Task) => void;
}

export function Hero({ task, now, onOpen }: Props) {
  if (!task) {
    return (
      <section className="panel shrink-0">
        <div className="panel-head">
          <span className="panel-eyebrow">Nothing pressing</span>
          <span className="panel-badge">— —</span>
        </div>
        <div className="flex min-h-[7.5rem] items-center px-4 py-4 md:px-5">
          <div>
            <div className="text-[clamp(1.8rem,3.4vw,3rem)] leading-[0.98] font-bold tracking-[-0.045em] text-ink-soft">
              All clear.
            </div>
            <div className="mt-2 text-[0.85rem] font-medium text-ink-quiet">
              Enjoy the quiet.
            </div>
          </div>
        </div>
      </section>
    );
  }

  const due = new Date(task.due_at);
  const bucket = bucketOf(due, now);
  const kicker =
    bucket === 'overdue'
      ? 'Overdue'
      : bucket === 'today'
        ? 'Next up'
        : bucket === 'tomorrow'
          ? 'Tomorrow'
          : 'Coming up';
  const countdown = fmtCountdown(due, task.is_all_day, bucket, now);
  const timeStr = !task.is_all_day ? fmtTimeOfDay(due) : null;

  return (
    <section className="panel panel-ticks shrink-0">
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
