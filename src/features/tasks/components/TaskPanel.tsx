import * as Dialog from '@radix-ui/react-dialog';
import { CommentThread } from '@/features/comments/components/CommentThread';
import { useToggleDone } from '../hooks';
import type { Task } from '../types';
import { bucketOf } from '../bucketing';
import { fmtCountdown, fmtTimeOfDay } from '@/shared/lib/time';
import { cn } from '@/shared/lib/cn';

interface Props {
  task: Task | null;
  onClose: () => void;
}

export function TaskPanel({ task, onClose }: Props) {
  const toggleDone = useToggleDone();
  const open = !!task;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[480px] flex-col bg-bg shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right"
          aria-describedby={undefined}
        >
          {task && <PanelBody task={task} onToggleDone={() => toggleDone(task)} onClose={onClose} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface BodyProps {
  task: Task;
  onToggleDone: () => void;
  onClose: () => void;
}

function PanelBody({ task, onToggleDone, onClose }: BodyProps) {
  const due = new Date(task.due_at);
  const now = new Date();
  const bucket = bucketOf(due, now);
  const countdown = fmtCountdown(due, task.is_all_day, bucket, now);
  const timeStr = task.is_all_day ? null : fmtTimeOfDay(due);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-rule px-8 pt-7 pb-6">
        <div className="flex flex-col gap-1.5">
          <div className="text-[0.65rem] font-semibold tracking-[0.24em] text-ink-soft uppercase">
            {task.type}
            {task.priority === 'high' && (
              <>
                <span className="mx-2 text-ink-quiet">·</span>
                <span className="text-accent">high</span>
              </>
            )}
            {task.tag && (
              <>
                <span className="mx-2 text-ink-quiet">·</span>
                {task.tag}
              </>
            )}
          </div>
          <Dialog.Title asChild>
            <h2
              className={cn(
                'text-[1.5rem] leading-tight font-semibold tracking-[-0.02em] text-ink',
                task.is_done && 'line-through opacity-50',
              )}
            >
              {task.title}
            </h2>
          </Dialog.Title>
          <div className="mt-1 text-[0.85rem] text-ink-soft">
            {countdown}
            {timeStr && <span className="mx-2 text-ink-quiet">·</span>}
            {timeStr}
          </div>
        </div>
        <Dialog.Close asChild>
          <button
            type="button"
            aria-label="Close"
            className="cursor-pointer text-2xl leading-none text-ink-soft transition-colors hover:text-ink"
          >
            ×
          </button>
        </Dialog.Close>
      </div>

      {task.note && (
        <div className="border-b border-rule px-8 py-5 text-[0.92rem] leading-relaxed whitespace-pre-wrap text-ink-soft">
          {task.note}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-3 border-b border-rule px-8 py-4">
        <button
          type="button"
          onClick={onToggleDone}
          className={cn(
            'flex cursor-pointer items-center gap-2 border px-3 py-1.5 text-[0.7rem] font-semibold tracking-[0.18em] uppercase transition-colors',
            task.is_done
              ? 'border-rule text-ink-soft hover:border-ink hover:text-ink'
              : 'border-ink text-ink hover:bg-ink hover:text-bg',
          )}
        >
          {task.is_done ? '↻ Reopen' : '✓ Mark done'}
        </button>
      </div>

      <div className="flex-1 px-8 py-6">
        <CommentThread taskId={task.id} />
      </div>

      {/* tiny "close on background click" hint — keyboard works via Esc */}
      <button
        type="button"
        onClick={onClose}
        aria-hidden
        tabIndex={-1}
        className="sr-only"
      />
    </div>
  );
}
