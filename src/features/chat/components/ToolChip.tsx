import { cn } from '@/shared/lib/cn';
import type { ToolEvent } from '../hooks';

/** Render a small inline chip describing a tool call Core is making. */
export function ToolChip({ event }: { event: ToolEvent }) {
  const label = labelFor(event);
  const dot =
    event.status === 'running'
      ? 'bg-ink-quiet animate-pulse'
      : event.status === 'ok'
        ? 'bg-accent'
        : 'bg-accent';
  const border =
    event.status === 'error' ? 'border-accent/60' : 'border-rule';

  return (
    <div
      className={cn(
        'flex items-center gap-2 border px-2.5 py-1.5',
        border,
        'text-[0.7rem] font-medium tracking-[-0.005em] text-ink',
      )}
    >
      <span aria-hidden className={cn('inline-block size-[6px] rounded-full', dot)} />
      <span className="font-semibold text-ink-soft tracking-[0.18em] uppercase text-[0.58rem]">
        {event.name.replace(/_/g, ' ')}
      </span>
      <span className="text-ink-quiet/70">·</span>
      <span className="truncate">{label}</span>
      {event.status === 'error' && event.error && (
        <span className="ml-2 text-accent truncate">— {event.error}</span>
      )}
    </div>
  );
}

function labelFor(e: ToolEvent): string {
  const a = e.args as Record<string, unknown>;
  switch (e.name) {
    case 'add_task':
      return String(a.title ?? a.id ?? '');
    case 'mark_done':
      return `${a.id} → ${a.done ? 'done' : 'open'}`;
    case 'edit_task': {
      const patch = (a.patch ?? {}) as Record<string, unknown>;
      const fields = Object.keys(patch).filter((k) => patch[k] != null);
      return `${a.id} · ${fields.join(', ') || '—'}`;
    }
    case 'delete_task':
      return String(a.id ?? '');
    case 'add_comment':
      return `${a.task_id}: ${String(a.body ?? '').slice(0, 40)}`;
    default:
      return JSON.stringify(a).slice(0, 60);
  }
}
