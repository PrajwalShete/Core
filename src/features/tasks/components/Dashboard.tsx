import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTasks } from '../hooks';
import { bucketTasks, pickHero } from '../bucketing';
import { useNow } from '@/shared/hooks/useNow';
import { useIsMobile } from '@/shared/hooks/useMediaQuery';
import { useShortcuts } from '@/shared/hooks/useShortcuts';
import { emit, on } from '@/shared/lib/events';
import type { Task } from '../types';
import { TopBar } from './TopBar';
import { Hero } from './Hero';
import { Quads } from './Quads';
import { Tape } from './Tape';
import { MissionTimer } from './MissionTimer';
import { Footer } from './Footer';
import { TaskPanel } from './TaskPanel';
import { ChatSidebar } from '@/features/chat/components/Sidebar';
import { ChatLauncher } from '@/features/chat/components/ChatLauncher';
import { Telemetry } from '@/features/telemetry/Telemetry';
import { CommandPalette } from '@/features/palette/CommandPalette';

export function Dashboard() {
  const { data: tasks, isLoading, error } = useTasks();
  const now = useNow(60_000);
  const isMobile = useIsMobile();
  const [openId, setOpenId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { buckets, hero, exams, counts } = useMemo(() => {
    const all = tasks ?? [];
    const buckets = bucketTasks(all, now);
    const hero = pickHero(buckets);
    const exams = all
      .filter((t) => t.tag === 'exams')
      .sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at));
    const counts = {
      today: buckets.today.filter((t) => !t.is_done).length,
      done: buckets.today.filter((t) => t.is_done).length,
      overdue: buckets.overdue.filter((t) => !t.is_done).length,
      ahead:
        buckets.tomorrow.filter((t) => !t.is_done).length +
        buckets.later.filter((t) => !t.is_done && t.tag !== 'exams').length,
    };
    return { buckets, hero, exams, counts };
  }, [tasks, now]);

  const open = useCallback((t: Task) => setOpenId(t.id), []);
  const close = useCallback(() => setOpenId(null), []);

  const openTask = useMemo(
    () => (openId && tasks ? (tasks.find((t) => t.id === openId) ?? null) : null),
    [openId, tasks],
  );

  // Allow components without prop access (e.g. the mobile topbar trigger) to
  // open the palette via the events bus.
  useEffect(() => on('open-palette', () => setPaletteOpen(true)), []);

  /* ── global keyboard shortcuts ─────────────────────────────────── */
  useShortcuts(
    useMemo(
      () => [
        // ⌘K / Ctrl+K → command palette
        {
          key: 'k',
          meta: true,
          allowInInput: true,
          description: 'Command palette',
          handler: () => setPaletteOpen((o) => !o),
        },
        {
          key: 'k',
          ctrl: true,
          allowInInput: true,
          description: 'Command palette',
          handler: () => setPaletteOpen((o) => !o),
        },
        // / → open chat / focus composer
        {
          key: '/',
          description: 'Open Core chat',
          handler: () => emit('open-chat'),
        },
        // Esc → close task panel (palette manages its own)
        {
          key: 'escape',
          description: 'Close detail panel',
          handler: () => close(),
        },
      ],
      [close],
    ),
  );

  /* ────────────────────────────────────────────────────────────────
   * Mobile layout
   * ──────────────────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div className="flex min-h-svh flex-col bg-bg">
        <div className="sticky top-0 z-20 bg-bg pt-safe">
          <div className="px-3 pb-2">
            <TopBar counts={counts} />
          </div>
        </div>

        <main className="flex flex-1 flex-col gap-2 px-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {isLoading && (
            <div className="panel flex items-center justify-center py-10 text-ink-soft">
              Loading…
            </div>
          )}
          {error && (
            <div className="panel flex items-center justify-center py-10 text-accent">
              {error instanceof Error ? error.message : 'Could not load tasks.'}
            </div>
          )}
          {!isLoading && !error && (
            <>
              <Hero task={hero} now={now} onOpen={open} emptyContext={{ counts }} />
              <MissionTimer exams={exams} onOpen={open} />
              <Quads buckets={buckets} heroId={hero?.id ?? null} now={now} onOpen={open} />
              <Tape exams={exams} now={now} onOpen={open} />
            </>
          )}
        </main>

        <ChatLauncher />
        <TaskPanel task={openTask} onClose={close} />
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onOpenTask={open}
          onOpenChat={() => emit('open-chat')}
        />
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────
   * Desktop layout
   * ──────────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-svh gap-2 overflow-hidden px-3 pt-3 pb-3 md:gap-2.5 md:px-4 md:pt-4 md:pb-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2 md:gap-2.5">
        <TopBar counts={counts} />
        <Telemetry />
        {isLoading && (
          <div className="panel flex flex-1 items-center justify-center text-ink-soft">
            Loading…
          </div>
        )}
        {error && (
          <div className="panel flex flex-1 items-center justify-center text-accent">
            {error instanceof Error ? error.message : 'Could not load tasks.'}
          </div>
        )}
        {!isLoading && !error && (
          <>
            <Hero task={hero} now={now} onOpen={open} emptyContext={{ counts }} />
            <MissionTimer exams={exams} onOpen={open} />
            <Quads buckets={buckets} heroId={hero?.id ?? null} now={now} onOpen={open} />
            <Tape exams={exams} now={now} onOpen={open} />
          </>
        )}
        <Footer />
      </div>

      <ChatSidebar />
      <TaskPanel task={openTask} onClose={close} />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenTask={open}
        onOpenChat={() => emit('focus-composer')}
      />
    </div>
  );
}
