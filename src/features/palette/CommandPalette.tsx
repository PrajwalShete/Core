import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { useTasks, useToggleDone } from '@/features/tasks/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { clearHistory } from '@/features/chat/api';
import type { Task } from '@/features/tasks/types';
import { emit } from '@/shared/lib/events';
import { cn } from '@/shared/lib/cn';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open a task's detail panel. */
  onOpenTask?: (task: Task) => void;
  /** Open the Core chat (mobile sheet or focus desktop sidebar). */
  onOpenChat?: () => void;
}

export function CommandPalette({ open, onOpenChange, onOpenTask, onOpenChat }: Props) {
  const { data: tasks = [] } = useTasks();
  const toggle = useToggleDone();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');

  // Reset query when the palette opens, so each invocation starts fresh.
  useEffect(() => {
    if (open) {
      setQuery('');
      emit('play-sound', { kind: 'open' });
    }
  }, [open]);

  const close = () => onOpenChange(false);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command Palette"
      className={cn(
        'fixed top-1/2 left-1/2 z-[60] w-[min(640px,92vw)] -translate-x-1/2 -translate-y-1/2',
        'panel panel-ticks outline-none',
        'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
      )}
      overlayClassName="fixed inset-0 z-[55] bg-black/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in"
    >
      <div className="border-b border-rule px-4 pt-3 pb-2">
        <div className="text-[0.6rem] font-semibold tracking-[0.28em] text-accent uppercase">
          Core / Command
        </div>
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search tasks, run a command…"
          className={cn(
            'mt-1 w-full bg-transparent text-[1.1rem] leading-relaxed text-ink outline-none',
            'placeholder:text-ink-quiet',
          )}
        />
      </div>

      <Command.List className="max-h-[60vh] overflow-y-auto px-2 py-2">
        <Command.Empty className="px-3 py-6 text-center text-[0.78rem] tracking-[-0.005em] text-ink-quiet">
          No matches.
        </Command.Empty>

        <Command.Group
          heading="Actions"
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[0.55rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.26em] [&_[cmdk-group-heading]]:text-ink-soft [&_[cmdk-group-heading]]:uppercase"
        >
          <PaletteItem
            value="open chat core ask"
            label="Open Core chat"
            shortcut="/"
            onSelect={() => {
              close();
              onOpenChat?.();
            }}
          />
          <PaletteItem
            value="clear chat reset thread"
            label="Clear chat thread"
            shortcut="⌘⇧K"
            danger
            onSelect={async () => {
              close();
              try {
                await clearHistory();
                qc.invalidateQueries({ queryKey: ['chat-history'] });
              } catch {
                /* ignore */
              }
            }}
          />
          <PaletteItem
            value="refresh data reload sync"
            label="Force refresh"
            shortcut="⌘R"
            onSelect={() => {
              close();
              qc.invalidateQueries();
            }}
          />
        </Command.Group>

        <Command.Group
          heading="Tasks"
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[0.55rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.26em] [&_[cmdk-group-heading]]:text-ink-soft [&_[cmdk-group-heading]]:uppercase"
        >
          {tasks.map((t) => (
            <PaletteItem
              key={`open-${t.id}`}
              value={`open ${t.title} ${t.id} ${t.tag ?? ''} ${t.subject ?? ''}`}
              label={t.title}
              hint={`${t.type}${t.is_done ? ' · done' : ''}`}
              onSelect={() => {
                close();
                onOpenTask?.(t);
              }}
            />
          ))}
        </Command.Group>

        <Command.Group
          heading="Toggle done"
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[0.55rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.26em] [&_[cmdk-group-heading]]:text-ink-soft [&_[cmdk-group-heading]]:uppercase"
        >
          {tasks.map((t) => (
            <PaletteItem
              key={`toggle-${t.id}`}
              value={`${t.is_done ? 'reopen' : 'mark done'} ${t.title} ${t.id}`}
              label={`${t.is_done ? '↻ Reopen' : '✓ Done'} — ${t.title}`}
              hint={t.type}
              onSelect={() => {
                close();
                toggle(t);
              }}
            />
          ))}
        </Command.Group>
      </Command.List>

      <div className="flex items-center justify-between border-t border-rule px-3 py-2 text-[0.55rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase">
        <span>↑↓ navigate · ⏎ select</span>
        <span>Esc close</span>
      </div>
    </Command.Dialog>
  );
}

interface ItemProps {
  value: string;
  label: string;
  hint?: string;
  shortcut?: string;
  danger?: boolean;
  onSelect: () => void;
}

function PaletteItem({ value, label, hint, shortcut, danger, onSelect }: ItemProps) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center justify-between gap-3 px-3 py-2',
        'text-[0.92rem] tracking-[-0.005em] text-ink',
        'data-[selected=true]:bg-rule/70 data-[selected=true]:text-ink',
        'aria-selected:bg-rule/70',
        danger && 'data-[selected=true]:text-accent',
      )}
    >
      <span className="flex-1 truncate">{label}</span>
      {hint && (
        <span className="text-[0.6rem] font-semibold tracking-[0.18em] text-ink-quiet uppercase">
          {hint}
        </span>
      )}
      {shortcut && (
        <span className="font-mono text-[0.62rem] tracking-[0.04em] text-ink-quiet">
          {shortcut}
        </span>
      )}
    </Command.Item>
  );
}
