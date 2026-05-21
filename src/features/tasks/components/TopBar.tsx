import { useNow } from '@/shared/hooks/useNow';
import { useIsMobile } from '@/shared/hooks/useMediaQuery';
import { DOWS_UPPER, MONTHS_UPPER } from '@/shared/lib/time';
import { cn } from '@/shared/lib/cn';

interface Counts {
  today: number;
  done: number;
  overdue: number;
  ahead: number;
}

interface PillProps {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
  compact?: boolean;
}

function Pill({ label, value, accent, muted, compact }: PillProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-baseline gap-2',
        compact ? 'px-2.5 py-1.5' : 'px-3 py-2 md:px-4',
      )}
    >
      <span
        className={cn(
          'leading-none font-bold tracking-[-0.02em] tabular-nums',
          compact ? 'text-[1.1rem]' : 'text-[1.4rem]',
          accent ? 'text-accent' : muted ? 'text-ink-quiet' : 'text-ink',
        )}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span
        className={cn(
          'font-semibold tracking-[0.24em] uppercase',
          compact ? 'text-[0.56rem]' : 'text-[0.62rem]',
          accent ? 'text-accent' : 'text-ink-soft',
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function TopBar({ counts }: { counts: Counts }) {
  const now = useNow(1000);
  const isMobile = useIsMobile();
  const month = MONTHS_UPPER[now.getMonth()] ?? '';
  const dow = DOWS_UPPER[now.getDay()] ?? '';
  const h24 = now.getHours();
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hh = String(h12).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  /* ── mobile layout ─────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <header className="panel panel-ticks">
        {/* top row: date · clock */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-baseline gap-2 leading-none">
            <span className="text-[0.58rem] font-semibold tracking-[0.24em] text-ink-soft uppercase">
              {month}
            </span>
            <span className="text-[1.05rem] font-bold tracking-[-0.04em] text-ink tabular-nums">
              {now.getDate()}
            </span>
            <span className="text-[0.58rem] font-semibold tracking-[0.24em] text-ink-soft uppercase">
              {dow}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="text-[1.05rem] font-light tracking-[-0.02em] text-ink tabular-nums">
              {hh}:{mm}
            </span>
            <span className="text-[0.56rem] font-semibold tracking-[0.24em] text-accent uppercase">
              {meridiem}
            </span>
          </div>
        </div>
        {/* bottom row: scrollable pills */}
        <div className="scrollx flex items-stretch divide-x divide-rule overflow-x-auto border-t border-rule">
          <Pill label="Today" value={counts.today} compact />
          <Pill label="Done" value={counts.done} compact muted />
          <Pill label="Overdue" value={counts.overdue} compact accent={counts.overdue > 0} />
          <Pill label="Ahead" value={counts.ahead} compact muted />
        </div>
      </header>
    );
  }

  /* ── desktop layout ────────────────────────────────────────────── */
  return (
    <header className="panel panel-ticks flex shrink-0 items-stretch">
      <div className="flex items-center gap-4 border-r border-rule px-4 py-2">
        <div className="leading-none">
          <div className="text-[0.62rem] font-semibold tracking-[0.24em] text-ink-soft uppercase">
            {month}
          </div>
          <div className="mt-1 text-[1.6rem] leading-none font-bold tracking-[-0.04em] text-ink tabular-nums">
            {now.getDate()}
          </div>
        </div>
        <div className="text-[0.62rem] font-semibold tracking-[0.24em] text-ink-soft uppercase">
          {dow}
        </div>
      </div>

      <div className="flex flex-1 items-stretch divide-x divide-rule">
        <Pill label="Today" value={counts.today} />
        <Pill label="Done" value={counts.done} muted />
        <Pill label="Overdue" value={counts.overdue} accent={counts.overdue > 0} />
        <Pill label="Ahead" value={counts.ahead} muted />
      </div>

      <div className="flex items-center gap-3 border-l border-rule px-4 py-2 leading-none">
        <div className="text-right">
          <div className="text-[1.6rem] leading-none font-light tracking-[-0.02em] text-ink tabular-nums">
            {hh}:{mm}
            <span className="ml-1 text-[0.7em] text-ink-quiet">{ss}</span>
          </div>
          <div className="mt-1 text-[0.62rem] font-semibold tracking-[0.24em] text-accent uppercase tabular-nums">
            {meridiem}
          </div>
        </div>
      </div>
    </header>
  );
}
