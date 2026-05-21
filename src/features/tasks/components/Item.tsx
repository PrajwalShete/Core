import type { Bucket, Task } from '../types';
import { bucketOf } from '../bucketing';
import { fmtWhen } from '@/shared/lib/time';
import { cn } from '@/shared/lib/cn';

interface Props {
  task: Task;
  now: Date;
  bucket?: Bucket;
  onOpen: (task: Task) => void;
}

export function Item({ task, now, bucket, onOpen }: Props) {
  const due = new Date(task.due_at);
  const b = bucket ?? bucketOf(due, now);
  const when = fmtWhen(due, task.is_all_day, b, now);
  const isHigh = task.priority === 'high';
  const isOverdue = b === 'overdue';

  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className={cn(
        'group flex w-full cursor-pointer items-start gap-2.5 text-left transition-opacity',
        task.is_done && 'opacity-35',
      )}
    >
      {/* status dot */}
      <span
        aria-hidden
        className={cn(
          'mt-[0.5em] inline-block size-[6px] shrink-0 rounded-full border',
          task.is_done
            ? 'border-ink-quiet bg-ink-quiet'
            : isOverdue
              ? 'border-accent bg-accent'
              : isHigh
                ? 'border-accent bg-transparent'
                : 'border-ink-quiet bg-transparent',
        )}
      />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-[0.92rem] leading-tight font-medium tracking-[-0.012em] text-ink',
            task.is_done && 'line-through',
          )}
        >
          {task.title}
        </div>
        <div
          className={cn(
            'mt-1 text-[0.6rem] font-semibold tracking-[0.18em] text-ink-soft uppercase tabular-nums',
            isOverdue && 'text-accent',
          )}
        >
          {when}
          <span className="mx-1.5 text-ink-quiet/70">·</span>
          {task.type}
        </div>
      </div>
    </button>
  );
}
