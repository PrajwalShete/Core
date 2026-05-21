import { supabase } from '@/shared/lib/supabase';
import type { Comment, CommentInsert } from './types';

export async function fetchComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertComment(input: CommentInsert): Promise<Comment> {
  const { data, error } = await supabase.from('comments').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function deleteComment(id: number): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}
