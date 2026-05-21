import { useFocus } from './useFocus';
import { cn } from '@/shared/lib/cn';

/** Tiny "FOCUS · MM:SS" pill rendered in the Telemetry strip when active. */
export function FocusBadge() {
  const { isActive, remainingMs, stop } = useFocus();
  if (!isActive) return null;

  const totalSec = Math.ceil(remainingMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return (
    <button
      type="button"
      onClick={stop}
      title="Stop focus session"
      className={cn(
        'flex shrink-0 cursor-pointer items-center gap-2 border border-accent/40 px-2.5 py-1',
        'transition-colors hover:border-accent hover:bg-accent/10',
      )}
    >
      <span aria-hidden className="pulse-dot" />
      <span className="text-[0.55rem] font-semibold tracking-[0.24em] text-accent uppercase">
        Focus
      </span>
      <span className="font-mono text-[0.78rem] tabular-nums text-ink">
        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
    </button>
  );
}
