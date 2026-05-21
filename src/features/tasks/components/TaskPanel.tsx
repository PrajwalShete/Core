import * as Dialog from '@radix-ui/react-dialog';
import { Drawer } from 'vaul';
import { CommentThread } from '@/features/comments/components/CommentThread';
import { useToggleDone } from '../hooks';
import { useIsMobile } from '@/shared/hooks/useMediaQuery';
import type { Task } from '../types';
import { bucketOf } from '../bucketing';
import { fmtCountdown, fmtTimeOfDay } from '@/shared/lib/time';
import { cn } from '@/shared/lib/cn';

interface Props {
  task: Task | null;
  onClose: () => void;
}

/**
 * Task detail.
 *
 *  - Desktop → right-side Radix Dialog drawer (existing behaviour).
 *  - Mobile  → vaul bottom-sheet (drag-to-dismiss, snaps near full-height).
 *
 * Same body in both, different shell.
 */
export function TaskPanel({ task, onClose }: Props) {
  const isMobile = useIsMobile();
  const toggleDone = useToggleDone();
  const open = !!task;

  if (isMobile) {
    return (
      <Drawer.Root
        open={open}
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] flex-col border-t border-rule bg-bg outline-none">
            <Drawer.Title className="sr-only">
              {task ? task.title : 'Task'}
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Task details and comment thread.
            </Drawer.Description>
            <div className="flex shrink-0 items-center justify-center pt-2 pb-1.5">
              <span aria-hidden className="h-1 w-10 rounded-full bg-rule" />
            </div>
            {task && (
              <PanelBody
                task={task}
                onToggleDone={() => toggleDone(task)}
                onClose={onClose}
                inDrawer
              />
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

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
          {task && (
            <PanelBody task={task} onToggleDone={() => toggleDone(task)} onClose={onClose} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface BodyProps {
  task: Task;
  onToggleDone: () => void;
  onClose: () => void;
  /** When true we omit the radix Dialog.Title/Close wrappers since vaul
   *  provides its own. */
  inDrawer?: boolean;
}

function PanelBody({ task, onToggleDone, onClose, inDrawer }: BodyProps) {
  const due = new Date(task.due_at);
  const now = new Date();
  const bucket = bucketOf(due, now);
  const countdown = fmtCountdown(due, task.is_all_day, bucket, now);
  const timeStr = task.is_all_day ? null : fmtTimeOfDay(due);

  const TitleTag = (props: { children: React.ReactNode; className: string }) =>
    inDrawer ? (
      <h2 className={props.className}>{props.children}</h2>
    ) : (
      <Dialog.Title asChild>
        <h2 className={props.className}>{props.children}</h2>
      </Dialog.Title>
    );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div
        className={cn(
          'flex shrink-0 items-start justify-between gap-3 border-b border-rule',
          inDrawer ? 'px-5 pt-3 pb-5' : 'px-8 pt-7 pb-6',
        )}
      >
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
          <TitleTag
            className={cn(
              'leading-tight font-semibold tracking-[-0.02em] text-ink',
              inDrawer ? 'text-[1.25rem]' : 'text-[1.5rem]',
              task.is_done && 'line-through opacity-50',
            )}
          >
            {task.title}
          </TitleTag>
          <div className="mt-1 text-[0.85rem] text-ink-soft">
            {countdown}
            {timeStr && <span className="mx-2 text-ink-quiet">·</span>}
            {timeStr}
          </div>
        </div>
        {!inDrawer && (
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close"
              className="cursor-pointer text-2xl leading-none text-ink-soft transition-colors hover:text-ink"
            >
              ×
            </button>
          </Dialog.Close>
        )}
        {inDrawer && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-[0.62rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase hover:text-ink"
          >
            Close
          </button>
        )}
      </div>

      {task.note && (
        <div
          className={cn(
            'border-b border-rule text-[0.92rem] leading-relaxed whitespace-pre-wrap text-ink-soft',
            inDrawer ? 'px-5 py-4' : 'px-8 py-5',
          )}
        >
          {task.note}
        </div>
      )}

      <div
        className={cn(
          'flex shrink-0 items-center gap-3 border-b border-rule',
          inDrawer ? 'px-5 py-3' : 'px-8 py-4',
        )}
      >
        <button
          type="button"
          onClick={onToggleDone}
          className={cn(
            'flex cursor-pointer items-center gap-2 border px-3 py-2 text-[0.7rem] font-semibold tracking-[0.18em] uppercase transition-colors',
            task.is_done
              ? 'border-rule text-ink-soft hover:border-ink hover:text-ink'
              : 'border-ink text-ink hover:bg-ink hover:text-bg',
          )}
        >
          {task.is_done ? '↻ Reopen' : '✓ Mark done'}
        </button>
      </div>

      <div className={cn('flex-1', inDrawer ? 'px-5 py-5' : 'px-8 py-6')}>
        <CommentThread taskId={task.id} />
      </div>
    </div>
  );
}
