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
        'flex w-full cursor-pointer flex-col items-start gap-1.5 text-left transition-opacity',
        task.is_done && 'opacity-35',
      )}
    >
      <div
        className={cn(
          'text-[1.05rem] leading-tight font-medium tracking-[-0.015em] text-ink',
          task.is_done && 'line-through',
        )}
      >
        {isHigh && (
          <span
            aria-hidden
            className="mr-2 inline-block size-[0.42em] translate-y-[0.18em] rounded-full bg-accent"
          />
        )}
        {task.title}
      </div>
      <div
        className={cn(
          'text-[0.68rem] font-semibold tracking-[0.18em] text-ink-soft uppercase tabular-nums',
          isOverdue && 'text-accent',
        )}
      >
        {when}
        <span className="mx-2 text-ink-quiet">·</span>
        {task.type}
      </div>
    </button>
  );
}
