import type { Database, Priority, TaskType } from '@/types/db';

export type { Priority, TaskType };

export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export type Bucket = 'overdue' | 'today' | 'tomorrow' | 'later';
