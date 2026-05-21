import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchComments, insertComment } from './api';
import type { Comment, CommentInsert } from './types';

export const commentsKey = (taskId: string) => ['comments', taskId] as const;

export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: taskId ? commentsKey(taskId) : ['comments', 'disabled'],
    queryFn: () => fetchComments(taskId!),
    enabled: !!taskId,
    staleTime: 30_000,
  });
}

export function useAddComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      insertComment({ task_id: taskId, body } satisfies CommentInsert),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: commentsKey(taskId) });
      const prev = qc.getQueryData<Comment[]>(commentsKey(taskId));
      const optimistic: Comment = {
        id: -Date.now(),
        task_id: taskId,
        body,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<Comment[]>(commentsKey(taskId), [...(prev ?? []), optimistic]);
      return { prev };
    },
    onError: (err, _body, ctx) => {
      if (ctx?.prev) qc.setQueryData(commentsKey(taskId), ctx.prev);
      toast.error(err instanceof Error ? err.message : 'Could not add comment');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: commentsKey(taskId) });
    },
  });
}
