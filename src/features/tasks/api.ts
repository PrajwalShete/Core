import { supabase } from '@/shared/lib/supabase';
import type { Task, TaskInsert, TaskUpdate } from './types';

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from('tasks').select('*').order('due_at');
  if (error) throw error;
  return data ?? [];
}

export async function updateTask(id: string, patch: TaskUpdate): Promise<Task> {
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function insertTask(task: TaskInsert): Promise<Task> {
  const { data, error } = await supabase.from('tasks').insert(task).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
