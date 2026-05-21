import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchTasks, updateTask } from './api';
import type { Task, TaskUpdate } from './types';

export const tasksKey = ['tasks'] as const;

export function useTasks() {
  return useQuery({
    queryKey: tasksKey,
    queryFn: fetchTasks,
    staleTime: 30_000,
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskUpdate }) => updateTask(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: tasksKey });
      const prev = qc.getQueryData<Task[]>(tasksKey);
      if (prev) {
        qc.setQueryData<Task[]>(
          tasksKey,
          prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        );
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(tasksKey, ctx.prev);
      toast.error(err instanceof Error ? err.message : 'Update failed');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: tasksKey });
    },
  });
}

export function useToggleDone() {
  const update = useUpdateTask();
  return (task: Task) => update.mutate({ id: task.id, patch: { is_done: !task.is_done } });
}
