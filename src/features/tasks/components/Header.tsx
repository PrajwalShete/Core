import { useNow } from '@/shared/hooks/useNow';
import { DOWS_LONG, DOWS_UPPER, MONTHS_UPPER } from '@/shared/lib/time';

export function Header() {
  const now = useNow(1000);
  const month = MONTHS_UPPER[now.getMonth()] ?? '';
  const dow = DOWS_UPPER[now.getDay()] ?? '';
  const dayLong = DOWS_LONG[now.getDay()] ?? '';
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  return (
    <header className="flex shrink-0 items-start justify-between">
      <div className="leading-none">
        <div className="text-[0.72rem] font-semibold tracking-[0.22em] text-ink-soft uppercase">
          {month}
        </div>
        <div className="my-[0.18em] text-[2.6rem] font-bold tracking-[-0.04em] text-ink">
          {now.getDate()}
        </div>
        <div className="text-[0.72rem] font-semibold tracking-[0.22em] text-ink-soft uppercase">
          {dow}
        </div>
      </div>
      <div className="text-right leading-none">
        <div className="text-[1.8rem] font-light tracking-[-0.02em] text-ink tabular-nums">
          {hh}:{mm}
        </div>
        <div className="mt-2 text-[0.72rem] font-semibold tracking-[0.22em] text-ink-soft uppercase">
          {dayLong}
        </div>
      </div>
    </header>
  );
}
