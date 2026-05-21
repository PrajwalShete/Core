import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNow } from '@/shared/hooks/useNow';
import { useUptime } from '@/shared/hooks/useUptime';
import { useLatency } from '@/shared/hooks/useLatency';
import { isSoundEnabled, setSoundEnabled } from '@/shared/lib/sounds';
import { emit } from '@/shared/lib/events';
import { cn } from '@/shared/lib/cn';

interface CellProps {
  label: string;
  value: string;
  dot?: 'live' | 'signal' | 'idle' | 'warn';
  mono?: boolean;
}

function Cell({ label, value, dot = 'live', mono = true }: CellProps) {
  const dotClass =
    dot === 'idle'
      ? 'bg-ink-quiet/40'
      : dot === 'warn'
        ? 'bg-accent'
        : dot === 'signal'
          ? 'pulse-dot signal'
          : 'pulse-dot';
  return (
    <div className="flex shrink-0 items-center gap-2 px-3 py-1.5">
      <span aria-hidden className={cn('relative size-[8px] rounded-full', dotClass)} />
      <span className="text-[0.55rem] font-semibold tracking-[0.24em] text-ink-soft uppercase">
        {label}
      </span>
      <span
        className={cn(
          'text-[0.72rem] tracking-[-0.005em] text-ink',
          mono && 'font-mono tabular-nums',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * The ambient telemetry strip. Lives between TopBar and Hero on desktop.
 * Hidden on mobile (mobile TopBar already two-rows; we don't want a third).
 */
export function Telemetry() {
  const uptime = useUptime();
  const { rtt, status } = useLatency();
  const now = useNow(1000);
  const qc = useQueryClient();
  const [lastSync, setLastSync] = useState<number>(Date.now());

  // Subscribe to react-query cache events: any successful fetch / set
  // counts as a sync, regardless of which query.
  useEffect(() => {
    const cache = qc.getQueryCache();
    const unsub = cache.subscribe((event) => {
      if (event.type === 'updated' && event.action?.type === 'success') {
        setLastSync(Date.now());
      }
    });
    return () => unsub();
  }, [qc]);

  const sinceSync = Math.max(0, Math.floor((now.getTime() - lastSync) / 1000));
  const syncLabel = sinceSync < 2 ? 'now' : sinceSync < 60 ? `${sinceSync}s ago` : `${Math.floor(sinceSync / 60)}m ago`;

  const linkValue =
    status === 'pending'
      ? '— ms'
      : status === 'down'
        ? 'offline'
        : `${rtt ?? '—'} ms`;
  const linkDot: CellProps['dot'] =
    status === 'down' ? 'warn' : status === 'slow' ? 'warn' : status === 'pending' ? 'idle' : 'signal';

  return (
    <section
      aria-label="System telemetry"
      className="panel scrollx hidden items-stretch divide-x divide-rule overflow-x-auto md:flex"
    >
      <Cell label="Uptime" value={uptime} dot="signal" />
      <Cell label="Link" value={linkValue} dot={linkDot} />
      <Cell label="Sync" value={syncLabel} dot="live" />
      <Cell label="Core" value="ready · gpt-5.4" dot="signal" mono={false} />
      <div className="flex flex-1 items-center justify-end gap-3 px-3 py-1.5">
        <SoundToggle />
        <span className="text-[0.55rem] font-semibold tracking-[0.28em] text-ink-quiet uppercase">
          ⌘K · Command
        </span>
      </div>
    </section>
  );
}

function SoundToggle() {
  const [enabled, setEnabled] = useState(() => isSoundEnabled());
  return (
    <button
      type="button"
      onClick={() => {
        const next = !enabled;
        setSoundEnabled(next);
        setEnabled(next);
        if (next) emit('play-sound', { kind: 'open' });
      }}
      title={enabled ? 'Sound on — click to mute' : 'Sound off — click to enable'}
      className="flex cursor-pointer items-center gap-1.5 text-[0.55rem] font-semibold tracking-[0.24em] uppercase"
    >
      <span aria-hidden className={cn('size-[6px] rounded-full', enabled ? 'bg-accent' : 'bg-ink-quiet/40')} />
      <span className={enabled ? 'text-ink' : 'text-ink-quiet'}>
        Sound {enabled ? 'on' : 'off'}
      </span>
    </button>
  );
}
