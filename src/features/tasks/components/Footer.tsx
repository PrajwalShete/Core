import { emit } from '@/shared/lib/events';

export function Footer() {
  return (
    <footer className="flex shrink-0 items-center justify-between border-t border-rule pt-2 text-[0.6rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase tabular-nums">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="pulse-dot signal" />
          Live
        </span>
        <span className="text-ink-quiet/70">·</span>
        <span>Core // Control</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => emit('open-palette')}
          className="inline-flex cursor-pointer items-center gap-1.5 transition-colors hover:text-ink"
          title="Command palette"
        >
          <span className="font-mono text-[0.66rem] tracking-[0.04em]">⌘K</span>
          <span>command</span>
        </button>
        <span className="text-ink-quiet/70">·</span>
        <button
          type="button"
          onClick={() => emit('open-chat')}
          className="inline-flex cursor-pointer items-center gap-1.5 transition-colors hover:text-ink"
          title="Open Core chat"
        >
          <span className="font-mono text-[0.66rem]">/</span>
          <span>ask core</span>
        </button>
        <span className="text-ink-quiet/70">·</span>
        <span>esc close</span>
      </div>
    </footer>
  );
}
