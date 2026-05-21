import { useEffect, useRef, useState } from 'react';
import { Drawer } from 'vaul';
import { useChat } from '../hooks';
import { Message } from './Message';
import { Composer } from './Composer';
import { cn } from '@/shared/lib/cn';

/**
 * Bottom-docked "Ask Core…" bar that lives at the bottom of the mobile
 * dashboard. Tap it → opens a vaul drawer with the full chat UI. The
 * input *is* the launcher, which is the strongest "this is an app"
 * signal we can give.
 */
export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const { history, pendingUser, pendingAssistant, isStreaming, error, send, stop } =
    useChat();
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom while content streams in.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, history.length, pendingAssistant, pendingUser]);

  return (
    <>
      {/* docked teaser input bar */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-bg',
          'pb-safe',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full cursor-pointer items-center gap-3 px-3 pt-2.5 pb-2 text-left"
        >
          <span aria-hidden className="size-[8px] rounded-full bg-accent" />
          <span className="text-[0.6rem] font-semibold tracking-[0.26em] text-accent uppercase">
            Core
          </span>
          <span className="flex-1 truncate text-[0.92rem] text-ink-quiet">
            Ask Core anything…
          </span>
          <span className="text-[0.7rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase">
            Tap ↑
          </span>
        </button>
      </div>

      {/* the chat sheet */}
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <Drawer.Content
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] flex-col',
              'border-t border-rule bg-bg outline-none',
            )}
          >
            <Drawer.Title className="sr-only">Core chat</Drawer.Title>
            <Drawer.Description className="sr-only">
              Chat with Core about your tasks.
            </Drawer.Description>

            {/* drag handle */}
            <div className="flex shrink-0 items-center justify-center pt-2 pb-1.5">
              <span aria-hidden className="h-1 w-10 rounded-full bg-rule" />
            </div>

            {/* sheet header */}
            <div className="flex shrink-0 items-center justify-between border-b border-rule px-4 pb-2">
              <div className="flex items-center gap-2">
                <span aria-hidden className="size-[6px] rounded-full bg-accent" />
                <span className="text-[0.62rem] font-semibold tracking-[0.26em] text-accent uppercase">
                  Core
                </span>
                <span className="text-[0.6rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase tabular-nums">
                  gpt-5.4 · codex
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer text-[0.62rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase hover:text-ink"
              >
                Close
              </button>
            </div>

            {/* messages */}
            <div
              ref={listRef}
              className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4"
            >
              {history.length === 0 && !pendingUser && !pendingAssistant && (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="text-[0.6rem] font-semibold tracking-[0.26em] text-ink-soft uppercase">
                    The room is quiet
                  </div>
                  <div className="max-w-[24ch] text-[0.85rem] leading-[1.45] text-ink-quiet">
                    Ask about your day, your tasks, exam prep, or just say hi.
                  </div>
                </div>
              )}

              {history.map((m) => (
                <Message key={m.id} role={m.role} content={m.content} />
              ))}

              {pendingUser && <Message role="user" content={pendingUser} />}
              {(isStreaming || pendingAssistant) && (
                <Message
                  role="assistant"
                  content={pendingAssistant}
                  streaming={isStreaming}
                />
              )}
              {error && (
                <div className="border border-accent/40 bg-accent/5 px-3 py-2 text-[0.78rem] text-accent">
                  {error}
                </div>
              )}
            </div>

            {/* composer pinned to the bottom of the sheet, respects safe area */}
            <div className="shrink-0 pb-safe-0">
              <Composer
                onSend={send}
                onStop={stop}
                isStreaming={isStreaming}
                autoFocus={open}
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
