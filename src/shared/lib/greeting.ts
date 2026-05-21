/**
 * Time-aware greeting + a short one-line subtitle that summarises the day.
 * Used as the empty-state of the Hero panel and inside the boot sequence.
 */
export interface GreetingArgs {
  now: Date;
  /** Owner name to address. */
  name?: string;
  counts: { today: number; done: number; overdue: number; ahead: number };
  nextEvent?: { label: string; whenISO: string } | null;
}

export function greeting({ now, name = 'Prajwal', counts, nextEvent }: GreetingArgs): {
  salute: string;
  line: string;
} {
  const h = now.getHours();
  let salute: string;
  if (h < 5) salute = 'Late night,';
  else if (h < 12) salute = 'Good morning,';
  else if (h < 17) salute = 'Good afternoon,';
  else if (h < 22) salute = 'Good evening,';
  else salute = 'It is late,';
  salute = `${salute} ${name}.`;

  // Build a one-line situational read.
  const parts: string[] = [];
  if (counts.overdue > 0) {
    parts.push(`${counts.overdue} overdue`);
  }
  if (counts.today > 0) {
    parts.push(`${counts.today} today`);
  }
  if (counts.done > 0) {
    parts.push(`${counts.done} done`);
  }
  if (nextEvent) {
    parts.push(`next: ${nextEvent.label}`);
  } else if (parts.length === 0) {
    parts.push('the dock is clear');
  }
  const line = parts.join(' · ');

  return { salute, line };
}
