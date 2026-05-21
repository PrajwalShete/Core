import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { supabase } from '@/shared/lib/supabase';
import { tasksKey } from '@/features/tasks/hooks';
import { commentsKey } from '@/features/comments/hooks';

function RealtimeBridge() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        void qc.invalidateQueries({ queryKey: tasksKey });
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        (payload) => {
          const taskId =
            (payload.new as { task_id?: string } | null)?.task_id ??
            (payload.old as { task_id?: string } | null)?.task_id;
          if (taskId) void qc.invalidateQueries({ queryKey: commentsKey(taskId) });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <RealtimeBridge />
        {children}
        <Toaster position="bottom-right" theme="system" richColors closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
