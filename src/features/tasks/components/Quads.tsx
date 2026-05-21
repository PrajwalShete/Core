import type { Task } from '../types';
import type { BucketedTasks } from '../bucketing';
import { Item } from './Item';
import { cn } from '@/shared/lib/cn';

interface QuadProps {
  label: string;
  list: Task[];
  bucket: 'overdue' | 'today' | 'tomorrow' | 'later';
  now: Date;
  onOpen: (task: Task) => void;
  accent?: boolean;
}

function Quad({ label, list, bucket, now, onOpen, accent }: QuadProps) {
  if (list.length === 0) return null;
  return (
    <div className="flex flex-col gap-3.5">
      <div
        className={cn(
          'mb-1 text-[0.7rem] font-semibold tracking-[0.26em] uppercase',
          accent ? 'text-accent' : 'text-ink-soft',
        )}
      >
        {label}
      </div>
      {list.map((task) => (
        <Item key={task.id} task={task} now={now} bucket={bucket} onOpen={onOpen} />
      ))}
    </div>
  );
}

interface Props {
  buckets: BucketedTasks;
  heroId: string | null;
  now: Date;
  onOpen: (task: Task) => void;
}

export function Quads({ buckets, heroId, now, onOpen }: Props) {
  const notHero = (arr: Task[]) => arr.filter((t) => t.id !== heroId);
  const notTagged = (arr: Task[]) => arr.filter((t) => t.tag !== 'exams');

  const sections: Array<{
    label: string;
    list: Task[];
    bucket: 'overdue' | 'today' | 'tomorrow' | 'later';
    accent?: boolean;
  }> = [
    { label: 'Also today', list: notHero(buckets.today), bucket: 'today' },
    { label: 'Tomorrow', list: notHero(buckets.tomorrow), bucket: 'tomorrow' },
    { label: 'Overdue', list: notHero(buckets.overdue), bucket: 'overdue', accent: true },
    { label: 'Later', list: notTagged(notHero(buckets.later)), bucket: 'later' },
  ];

  const anyVisible = sections.some((s) => s.list.length > 0);
  if (!anyVisible) return null;

  return (
    <section className="grid shrink-0 grid-cols-1 gap-x-[6vw] gap-y-6 border-t border-rule pt-6 md:grid-cols-2">
      {sections.map((s) => (
        <Quad
          key={s.label}
          label={s.label}
          list={s.list}
          bucket={s.bucket}
          now={now}
          onOpen={onOpen}
          {...(s.accent ? { accent: true } : {})}
        />
      ))}
    </section>
  );
}
