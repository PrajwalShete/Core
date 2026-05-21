/**
 * Time formatting helpers. Centralised so the hero, quadrants, and tape all use
 * the same logic for "in 28 minutes" / "2 days ago" / "Sat" etc.
 */

const SHORT_DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const MONTHS_UPPER = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;
export const DOWS_UPPER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
export const DOWS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function fmtTimeOfDay(due: Date): string {
  const h = due.getHours();
  const m = due.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Short label used in quadrant items — "3 pm", "today", "Sat", "12 Jun". */
export function fmtWhen(
  due: Date,
  isAllDay: boolean,
  bucket: 'overdue' | 'today' | 'tomorrow' | 'later',
  now = new Date(),
): string {
  const diff = +due - +now;
  if (bucket === 'overdue') {
    const a = -diff;
    if (a < 3_600_000) return `${Math.max(1, Math.round(a / 60_000))} min ago`;
    if (a < 86_400_000) return `${Math.round(a / 3_600_000)} hr ago`;
    return `${Math.round(a / 86_400_000)}d ago`;
  }
  if (!isAllDay) return fmtTimeOfDay(due);
  if (bucket === 'today') return 'today';
  if (bucket === 'tomorrow') return 'tomorrow';
  const days = Math.round(diff / 86_400_000);
  const dow = SHORT_DOWS[due.getDay()];
  if (days < 7 && dow) return dow;
  const mon = SHORT_MONTHS[due.getMonth()];
  return mon ? `${due.getDate()} ${mon}` : String(due.getDate());
}

/** Long phrase used by the hero — "in 28 minutes", "2 days overdue", "tomorrow". */
export function fmtCountdown(
  due: Date,
  isAllDay: boolean,
  bucket: 'overdue' | 'today' | 'tomorrow' | 'later',
  now = new Date(),
): string {
  const diff = +due - +now;
  const a = Math.abs(diff);
  if (bucket === 'overdue') {
    if (a < 60_000) return 'just overdue';
    if (a < 3_600_000) return `${Math.round(a / 60_000)} minutes overdue`;
    if (a < 86_400_000) return `${Math.round(a / 3_600_000)} hours overdue`;
    return `${Math.round(a / 86_400_000)} days overdue`;
  }
  if (!isAllDay && a < 86_400_000) {
    if (a < 3_600_000) {
      const mins = Math.max(1, Math.round(a / 60_000));
      return `in ${mins} minute${mins === 1 ? '' : 's'}`;
    }
    const hrs = Math.round(a / 3_600_000);
    return `in ${hrs} hour${hrs === 1 ? '' : 's'}`;
  }
  if (bucket === 'today') return 'later today';
  if (bucket === 'tomorrow') return 'tomorrow';
  const days = Math.max(1, Math.round(a / 86_400_000));
  return `in ${days} days`;
}

export function fmtMonthDay(d: Date): string {
  const m = SHORT_MONTHS[d.getMonth()];
  return m ? `${d.getDate()} ${m}` : String(d.getDate());
}

export function fmtRelativeTimestamp(d: Date, now = new Date()): string {
  const a = +now - +d;
  if (a < 60_000) return 'just now';
  if (a < 3_600_000) return `${Math.round(a / 60_000)}m ago`;
  if (a < 86_400_000) return `${Math.round(a / 3_600_000)}h ago`;
  const days = Math.round(a / 86_400_000);
  if (days < 7) return `${days}d ago`;
  return fmtMonthDay(d);
}
