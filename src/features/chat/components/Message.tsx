import { cn } from '@/shared/lib/cn';
import type { Role } from '../types';

interface Props {
  role: Role;
  content: string;
  streaming?: boolean;
}

/** A single chat bubble. User and assistant share the same column —
 *  differentiation is via a tiny role eyebrow and a subtle accent. */
export function Message({ role, content, streaming }: Props) {
  const eyebrow =
    role === 'user' ? 'YOU' : role === 'assistant' ? 'CORE' : role.toUpperCase();
  const isCore = role === 'assistant';

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          'text-[0.58rem] font-semibold tracking-[0.26em] uppercase',
          isCore ? 'text-accent' : 'text-ink-soft',
        )}
      >
        {eyebrow}
        {streaming && (
          <span aria-hidden className="ml-2 inline-block animate-pulse text-ink-quiet">
            ●
          </span>
        )}
      </div>
      <div
        className={cn(
          'text-[0.88rem] leading-[1.5] tracking-[-0.005em] whitespace-pre-wrap break-words',
          isCore ? 'text-ink' : 'text-ink/95',
        )}
      >
        {content}
        {streaming && content.length === 0 && (
          <span className="text-ink-quiet">thinking…</span>
        )}
      </div>
    </div>
  );
}
