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
    <section className="panel shrink-0">
      <div className="panel-head">
        <span className="panel-eyebrow">Exam season</span>
        <span className="panel-badge">
          {fmtMonthDay(firstDue)} — {fmtMonthDay(lastDue)}
          <span className="ml-2 text-ink-quiet/70">·</span>
          <span className="ml-2">
            {exams.length.toString().padStart(2, '0')} {exams.length === 1 ? 'EVENT' : 'EVENTS'}
          </span>
        </span>
      </div>
      <div className="scrollx grid auto-cols-[5.5rem] grid-flow-col gap-px overflow-x-auto bg-rule px-px md:auto-cols-fr md:overflow-x-visible">
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
                'relative flex cursor-pointer flex-col items-start gap-0.5 bg-bg px-2.5 pt-3.5 pb-2.5 text-left transition-opacity hover:bg-rule/40',
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
                <span className="absolute top-0.5 right-1.5 text-[0.55rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase">
                  {MONTHS_UPPER[due.getMonth()] ?? ''}
                </span>
              )}
              <span
                className={cn(
                  'text-[0.78rem] font-bold tracking-[0.04em]',
                  isExam ? 'text-accent' : 'text-ink',
                  task.is_done && 'line-through',
                )}
              >
                {task.subject ?? task.title}
              </span>
              <span
                className={cn(
                  'text-[0.55rem] font-semibold tracking-[0.22em] uppercase',
                  isExam ? 'text-accent' : 'text-ink-soft',
                )}
              >
                {isExam ? 'exam' : 'prep'}
              </span>
              <span
                className={cn(
                  'mt-1.5 leading-none tracking-[-0.03em] tabular-nums',
                  isExam ? 'text-[1.55rem] font-bold' : 'text-[1.2rem] font-semibold',
                )}
              >
                {due.getDate()}
              </span>
              <span
                className={cn(
                  'text-[0.55rem] font-semibold tracking-[0.2em] uppercase',
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
