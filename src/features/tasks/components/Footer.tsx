export function Footer() {
  return (
    <footer className="flex shrink-0 items-center justify-between border-t border-rule pt-2 text-[0.6rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase tabular-nums">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-[6px] rounded-full bg-accent/70" />
          Live
        </span>
        <span className="text-ink-quiet/70">·</span>
        <span>Core // Control</span>
      </div>
      <div className="flex items-center gap-3">
        <span>Tap to open</span>
        <span className="text-ink-quiet/70">·</span>
        <span>ESC to close</span>
      </div>
    </footer>
  );
}
