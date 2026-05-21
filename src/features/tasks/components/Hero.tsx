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
      <section className="flex min-h-0 flex-1 flex-col justify-center">
        <div className="mb-5 text-[0.72rem] font-semibold tracking-[0.24em] text-ink-soft uppercase">
          Nothing pressing
        </div>
        <div className="max-w-[20ch] text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[0.98] font-bold tracking-[-0.045em] text-ink-soft">
          All clear.
        </div>
        <div className="mt-3 text-[clamp(0.95rem,1.3vw,1.25rem)] font-medium text-ink-soft">
          Enjoy the quiet.
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
    <section className="flex min-h-0 flex-1 flex-col justify-center">
      <div className="mb-5 text-[0.72rem] font-semibold tracking-[0.24em] text-ink-soft uppercase">
        {kicker}
      </div>
      <button
        type="button"
        onClick={() => onOpen(task)}
        className={cn(
          'block max-w-[20ch] cursor-pointer text-left text-[clamp(2.6rem,6.4vw,5.2rem)] leading-[0.98] font-bold tracking-[-0.045em] text-ink',
          task.is_done && 'opacity-35 decoration-[3px] line-through',
        )}
      >
        {task.title}
      </button>
      <div className="mt-3 text-[clamp(0.95rem,1.3vw,1.25rem)] font-medium tracking-[-0.005em] text-accent">
        {countdown}
        {timeStr && <span className="mx-3 text-ink-quiet">·</span>}
        {timeStr}
        <span className="ml-3 text-[0.68em] font-semibold tracking-[0.24em] text-ink-soft uppercase">
          {task.type}
        </span>
      </div>
    </section>
  );
}
