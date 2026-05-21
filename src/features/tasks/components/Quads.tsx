import type { Task } from '../types';
import type { BucketedTasks } from '../bucketing';
import { Item } from './Item';
import { cn } from '@/shared/lib/cn';

interface PanelProps {
  label: string;
  list: Task[];
  bucket: 'overdue' | 'today' | 'tomorrow' | 'later';
  now: Date;
  onOpen: (task: Task) => void;
  accent?: boolean;
  empty?: string;
}

function Panel({ label, list, bucket, now, onOpen, accent, empty }: PanelProps) {
  return (
    <div className="panel flex min-h-0 flex-col">
      <div className="panel-head">
        <span className={cn('panel-eyebrow', accent && 'text-accent')}>{label}</span>
        <span className={cn('panel-badge', accent && list.length > 0 && 'text-accent')}>
          {String(list.length).padStart(2, '0')}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3.5 md:px-5">
        {list.length === 0 ? (
          <div className="text-[0.72rem] font-semibold tracking-[0.2em] text-ink-quiet uppercase">
            {empty ?? '— empty —'}
          </div>
        ) : (
          list.map((task) => (
            <Item key={task.id} task={task} now={now} bucket={bucket} onOpen={onOpen} />
          ))
        )}
      </div>
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

  const overdue = notHero(buckets.overdue);
  const today = notHero(buckets.today);
  const tomorrow = notHero(buckets.tomorrow);
  const later = notTagged(notHero(buckets.later));

  // Three primary modules. Overdue gets folded into "Today" visually if any,
  // but we surface them as a separate module if non-empty.
  const showOverdue = overdue.length > 0;

  return (
    // On mobile the columns stack as full-width panels; on desktop it's a
    // 3-column row sharing the row height.
    <section className="grid min-h-0 grid-cols-1 gap-2 md:flex-1 md:grid-cols-3 md:gap-2.5">
      {showOverdue ? (
        <Panel
          label="Overdue"
          list={overdue}
          bucket="overdue"
          now={now}
          onOpen={onOpen}
          accent
          empty="nothing late"
        />
      ) : (
        <Panel
          label="Today"
          list={today}
          bucket="today"
          now={now}
          onOpen={onOpen}
          empty="nothing else today"
        />
      )}
      <Panel
        label={showOverdue ? 'Today' : 'Tomorrow'}
        list={showOverdue ? today : tomorrow}
        bucket={showOverdue ? 'today' : 'tomorrow'}
        now={now}
        onOpen={onOpen}
        empty={showOverdue ? 'nothing else today' : 'free tomorrow'}
      />
      <Panel
        label={showOverdue ? 'Ahead' : 'Later'}
        list={showOverdue ? [...tomorrow, ...later] : later}
        bucket={showOverdue ? 'tomorrow' : 'later'}
        now={now}
        onOpen={onOpen}
        empty="nothing queued"
      />
    </section>
  );
}
