import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/shared/lib/cn';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Row {
  keys: string[];
  label: string;
}

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: 'Navigation',
    rows: [
      { keys: ['⌘', 'K'], label: 'Command palette' },
      { keys: ['Ctrl', 'K'], label: 'Command palette (Windows / Linux)' },
      { keys: ['/'], label: 'Open Core chat' },
      { keys: ['?'], label: 'Show this help' },
      { keys: ['Esc'], label: 'Close panel / palette / sheet' },
    ],
  },
  {
    title: 'Tasks',
    rows: [
      { keys: ['T'], label: 'Toggle done on the hero task' },
      { keys: ['Enter'], label: 'Open the hero task detail' },
    ],
  },
  {
    title: 'Chat',
    rows: [
      { keys: ['⏎'], label: 'Send message' },
      { keys: ['Shift', '⏎'], label: 'New line in composer' },
      { keys: ['/clear'], label: 'Wipe chat thread' },
      { keys: ['/focus', 'N'], label: 'Start a focus session (N minutes)' },
    ],
  },
];

export function HelpSheet({ open, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[55] bg-black/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-[60] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2',
            'panel panel-ticks outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
          )}
          aria-describedby={undefined}
        >
          <div className="panel-head">
            <Dialog.Title asChild>
              <span className="panel-eyebrow text-accent">Core / Reference</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="cursor-pointer text-[0.6rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase hover:text-ink"
              >
                Close · Esc
              </button>
            </Dialog.Close>
          </div>
          <div className="grid max-h-[70vh] gap-5 overflow-y-auto p-5 md:grid-cols-2">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="text-[0.58rem] font-semibold tracking-[0.26em] text-ink-soft uppercase">
                  {section.title}
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {section.rows.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 text-[0.82rem] tracking-[-0.005em]"
                    >
                      <span className="text-ink">{row.label}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {row.keys.map((k, j) => (
                          <kbd
                            key={j}
                            className="border border-rule bg-bg-deep/40 px-1.5 py-0.5 font-mono text-[0.66rem] tracking-[0.04em] text-ink-soft"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
