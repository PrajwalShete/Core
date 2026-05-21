import { useState } from 'react';
import { useAddComment, useComments } from '../hooks';
import { fmtRelativeTimestamp } from '@/shared/lib/time';
import { useNow } from '@/shared/hooks/useNow';

interface Props {
  taskId: string;
}

export function CommentThread({ taskId }: Props) {
  const { data: comments, isLoading } = useComments(taskId);
  const add = useAddComment(taskId);
  const [draft, setDraft] = useState('');
  const now = useNow(30_000);

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    add.mutate(body);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[0.7rem] font-semibold tracking-[0.24em] text-ink-soft uppercase">
        Comments
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && <div className="text-sm text-ink-soft">Loading…</div>}
        {!isLoading && comments && comments.length === 0 && (
          <div className="text-sm text-ink-quiet">No comments yet.</div>
        )}
        {comments?.map((c) => (
          <div
            key={c.id}
            className="flex flex-col gap-1 border-l border-rule pl-3 text-[0.92rem] leading-snug text-ink"
          >
            <span className="whitespace-pre-wrap">{c.body}</span>
            <span className="text-[0.62rem] font-semibold tracking-[0.18em] text-ink-quiet uppercase tabular-nums">
              {fmtRelativeTimestamp(new Date(c.created_at), now)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add a note… (⌘/Ctrl-Enter to save)"
          rows={3}
          className="w-full resize-none border border-rule bg-bg px-3 py-2 text-[0.95rem] text-ink placeholder:text-ink-quiet focus:border-accent focus:outline-none"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim() || add.isPending}
            className="cursor-pointer border border-ink px-3 py-1 text-[0.7rem] font-semibold tracking-[0.18em] text-ink uppercase transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {add.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
