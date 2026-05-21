import { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks';
import { Message } from './Message';
import { Composer } from './Composer';
import { ToolChip } from './ToolChip';
import { on } from '@/shared/lib/events';
import { cn } from '@/shared/lib/cn';

export function ChatSidebar() {
  const [open, setOpen] = useState(true);
  const {
    history,
    pendingUser,
    pendingAssistant,
    pendingTools,
    isStreaming,
    error,
    send,
    stop,
  } = useChat();
  const listRef = useRef<HTMLDivElement>(null);
  const [focusBump, setFocusBump] = useState(0);

  // Scroll to bottom whenever new content arrives.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [history.length, pendingAssistant, pendingUser, pendingTools.length]);

  // External signals — open-chat expands the sidebar; focus-composer
  // ensures the textarea grabs focus on the next render.
  useEffect(() => {
    const offOpen = on('open-chat', () => {
      setOpen(true);
      setFocusBump((n) => n + 1);
    });
    const offFocus = on('focus-composer', () => {
      setOpen(true);
      setFocusBump((n) => n + 1);
    });
    return () => {
      offOpen();
      offFocus();
    };
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Open Core"
        className={cn(
          // hidden on mobile — that layout uses ChatLauncher's bottom-sheet.
          'panel panel-ticks hidden w-[34px] shrink-0 cursor-pointer flex-col items-center justify-between py-3 md:flex',
          'hover:border-ink/30 transition-colors',
        )}
      >
        <span className="text-[0.6rem] font-semibold tracking-[0.3em] text-accent uppercase [writing-mode:vertical-rl]">
          Core
        </span>
        <span aria-hidden className="text-[0.7rem] text-ink-quiet">◂</span>
        <span className="text-[0.55rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase [writing-mode:vertical-rl]">
          gpt-5.4
        </span>
      </button>
    );
  }

  return (
    <aside className="panel panel-ticks hidden w-[380px] shrink-0 flex-col md:flex">
      {/* head */}
      <div className="panel-head">
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-[6px] rounded-full bg-accent" />
          <span className="panel-eyebrow text-accent">Core</span>
          <span className="panel-badge">gpt-5.4 · codex</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer text-[0.6rem] font-semibold tracking-[0.22em] text-ink-quiet uppercase hover:text-ink"
          title="Collapse"
        >
          ▸
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

        {history.map((m) => {
          // Render historical tool turns as a chip group, not as a message.
          if (m.role === 'tool' && Array.isArray(m.tool_calls)) {
            return (
              <div key={m.id} className="flex flex-col gap-1.5">
                {m.tool_calls.map((tc, i) => {
                  const tr = m.tool_results?.[i];
                  const ok = tr?.result?.ok ?? true;
                  return (
                    <ToolChip
                      key={`${m.id}-${i}`}
                      event={{
                        call_id: `${m.id}-${i}`,
                        name: tc.name,
                        args: tc.args ?? {},
                        status: ok ? 'ok' : 'error',
                        ...(tr?.result?.error ? { error: tr.result.error } : {}),
                      }}
                    />
                  );
                })}
              </div>
            );
          }
          return <Message key={m.id} role={m.role} content={m.content} />;
        })}

        {pendingUser && <Message role="user" content={pendingUser} />}

        {pendingTools.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {pendingTools.map((t) => (
              <ToolChip key={t.call_id} event={t} />
            ))}
          </div>
        )}

        {(isStreaming || pendingAssistant) && (
          <Message role="assistant" content={pendingAssistant} streaming={isStreaming} />
        )}

        {error && (
          <div className="border border-accent/40 bg-accent/5 px-3 py-2 text-[0.78rem] text-accent">
            {error}
          </div>
        )}
      </div>

      <Composer
        key={focusBump}
        onSend={send}
        onStop={stop}
        isStreaming={isStreaming}
        autoFocus={focusBump > 0}
      />
    </aside>
  );
}
