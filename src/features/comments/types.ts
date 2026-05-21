import type { Database } from '@/types/db';

export type Comment = Database['public']['Tables']['comments']['Row'];
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];
