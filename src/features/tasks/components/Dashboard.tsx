import { useMemo, useState } from 'react';
import { useTasks } from '../hooks';
import { bucketTasks, pickHero } from '../bucketing';
import { useNow } from '@/shared/hooks/useNow';
import type { Task } from '../types';
import { Header } from './Header';
import { Hero } from './Hero';
import { Quads } from './Quads';
import { Tape } from './Tape';
import { TaskPanel } from './TaskPanel';

export function Dashboard() {
  const { data: tasks, isLoading, error } = useTasks();
  const now = useNow(60_000); // re-bucket every minute
  const [openId, setOpenId] = useState<string | null>(null);

  const { buckets, hero, exams } = useMemo(() => {
    const all = tasks ?? [];
    const buckets = bucketTasks(all, now);
    const hero = pickHero(buckets);
    const exams = all
      .filter((t) => t.tag === 'exams')
      .sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at));
    return { buckets, hero, exams };
  }, [tasks, now]);

  const open = (t: Task) => setOpenId(t.id);
  const close = () => setOpenId(null);

  const openTask = useMemo(
    () => (openId && tasks ? (tasks.find((t) => t.id === openId) ?? null) : null),
    [openId, tasks],
  );

  return (
    <div className="mx-auto flex h-screen max-w-[1180px] flex-col gap-[2.5vh] overflow-hidden px-[6vw] pt-[3.5vh] pb-[3vh]">
      <Header />
      {isLoading && <div className="text-ink-soft">Loading…</div>}
      {error && (
        <div className="text-accent">
          {error instanceof Error ? error.message : 'Could not load tasks.'}
        </div>
      )}
      {!isLoading && !error && (
        <>
          <Hero task={hero} now={now} onOpen={open} />
          <Quads buckets={buckets} heroId={hero?.id ?? null} now={now} onOpen={open} />
          <Tape exams={exams} now={now} onOpen={open} />
        </>
      )}
      <TaskPanel task={openTask} onClose={close} />
    </div>
  );
}
