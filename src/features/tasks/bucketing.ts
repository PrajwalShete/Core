import type { Bucket, Task } from './types';

export function startOfDay(d: Date | string): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function bucketOf(due: Date, now = new Date()): Bucket {
  if (due < now) return 'overdue';
  const today = startOfDay(now).getTime();
  const dueDay = startOfDay(due).getTime();
  const days = Math.round((dueDay - today) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return 'later';
}

export interface BucketedTasks {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
  later: Task[];
}

export function bucketTasks(tasks: Task[], now = new Date()): BucketedTasks {
  const out: BucketedTasks = { overdue: [], today: [], tomorrow: [], later: [] };
  for (const t of tasks) out[bucketOf(new Date(t.due_at), now)].push(t);
  for (const k of Object.keys(out) as Bucket[]) {
    out[k].sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at));
  }
  return out;
}

/**
 * The "hero" is the single most pressing not-yet-done task: overdue first, then
 * today, then tomorrow, then the next "later" item. Null if nothing remains.
 */
export function pickHero(buckets: BucketedTasks): Task | null {
  const live = (arr: Task[]) => arr.filter((t) => !t.is_done);
  return (
    live(buckets.overdue)[0] ??
    live(buckets.today)[0] ??
    live(buckets.tomorrow)[0] ??
    live(buckets.later)[0] ??
    null
  );
}
