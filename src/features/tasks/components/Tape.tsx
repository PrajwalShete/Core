import type { Task } from '../types';
import { startOfDay } from '../bucketing';
import { fmtMonthDay, DOWS_UPPER, MONTHS_UPPER } from '@/shared/lib/time';
import { cn } from '@/shared/lib/cn';

interface Props {
  exams: Task[]; // already sorted by due_at
  now: Date;
  onOpen: (task: Task) => void;
}

export function Tape({ exams, now, onOpen }: Props) {
  if (exams.length === 0) return null;

  const today = startOfDay(now).getTime();
  const firstDue = new Date(exams[0]!.due_at);
  const lastDue = new Date(exams[exams.length - 1]!.due_at);

  let prevMonth = -1;

  return (
    <section className="shrink-0 border-t border-rule pt-6">
      <div className="mb-5 flex items-baseline justify-between">
        <div className="text-[0.7rem] font-semibold tracking-[0.26em] text-ink-soft uppercase">
          Exam season
        </div>
        <div className="text-[0.7rem] font-semibold tracking-[0.18em] text-ink-quiet uppercase tabular-nums">
          {fmtMonthDay(firstDue)} — {fmtMonthDay(lastDue)}
        </div>
      </div>

      <div className="grid auto-cols-fr grid-flow-col gap-1.5">
        {exams.map((task) => {
          const due = new Date(task.due_at);
          const cellDay = startOfDay(due).getTime();
          const isExam = task.type === 'exam';
          const isToday = cellDay === today;
          const isPast = cellDay < today && !isToday;
          const showMonth = due.getMonth() !== prevMonth;
          prevMonth = due.getMonth();

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onOpen(task)}
              className={cn(
                'relative flex cursor-pointer flex-col items-start gap-0.5 px-1.5 pt-3 pb-2 text-left transition-opacity',
                isPast && 'opacity-32',
                task.is_done && 'opacity-30',
              )}
            >
              {/* today indicator */}
              {isToday && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-0 top-0 h-[2px]',
                    isExam ? 'bg-accent' : 'bg-ink',
                  )}
                />
              )}
              {showMonth && (
                <span className="absolute -top-5 left-0 text-[0.6rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase">
                  {MONTHS_UPPER[due.getMonth()] ?? ''}
                </span>
              )}
              <span
                className={cn(
                  'text-[0.82rem] font-bold tracking-[0.04em]',
                  isExam ? 'text-accent' : 'text-ink',
                  task.is_done && 'line-through',
                )}
              >
                {task.subject ?? task.title}
              </span>
              <span
                className={cn(
                  'text-[0.6rem] font-semibold tracking-[0.22em] uppercase',
                  isExam ? 'text-accent' : 'text-ink-soft',
                )}
              >
                {isExam ? 'exam' : 'prep'}
              </span>
              <span
                className={cn(
                  'mt-2 leading-none tracking-[-0.03em] tabular-nums',
                  isExam ? 'text-[1.85rem] font-bold' : 'text-[1.4rem] font-semibold',
                )}
              >
                {due.getDate()}
              </span>
              <span
                className={cn(
                  'text-[0.6rem] font-semibold tracking-[0.2em] uppercase',
                  isToday ? 'text-ink' : 'text-ink-quiet',
                )}
              >
                {DOWS_UPPER[due.getDay()] ?? ''}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
