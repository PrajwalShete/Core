/**
 * Hand-written Database types matching db/migrations/0001_init.sql.
 *
 * Shape mirrors the output of `supabase gen types typescript` so the Supabase
 * client's generic inference works without modification. If we ever wire the
 * Supabase CLI, regenerate this file from the live schema and delete the hand
 * work.
 */

export type TaskType = 'call' | 'errand' | 'task' | 'study' | 'meet' | 'buy' | 'exam';
export type Priority = 'high' | 'normal' | 'low';

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          title: string;
          due_at: string;
          is_all_day: boolean;
          type: TaskType;
          priority: Priority;
          tag: string | null;
          subject: string | null;
          note: string;
          is_done: boolean;
          sort_order: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          due_at: string;
          is_all_day?: boolean;
          type: TaskType;
          priority?: Priority;
          tag?: string | null;
          subject?: string | null;
          note?: string;
          is_done?: boolean;
          sort_order?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          due_at?: string;
          is_all_day?: boolean;
          type?: TaskType;
          priority?: Priority;
          tag?: string | null;
          subject?: string | null;
          note?: string;
          is_done?: boolean;
          sort_order?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: number;
          task_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          task_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          task_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
