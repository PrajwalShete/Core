// ╭───────────────────────────────────────────────────────────────────╮
// │ tools.ts — function-calling definitions for Core                  │
// │                                                                   │
// │ Every tool here is something Prajwal would normally do by         │
// │ clicking — adding a task, marking it done, dropping a comment.    │
// │ The model picks one, we execute it server-side against Supabase   │
// │ with the service role, hand the result back, and let it continue. │
// ╰───────────────────────────────────────────────────────────────────╯

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/** Responses-API function tool definition shape. */
export interface ToolDef {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict?: boolean;
}

/** Fields used by add_task (all required, non-nullable). */
const TASK_FIELDS = {
  title: { type: 'string', description: 'Short task title, sentence-case.' },
  due_at: {
    type: 'string',
    description:
      'Due timestamp as ISO 8601 with timezone offset (IST is +05:30). For all-day items pick a sensible time of day (e.g. 09:00).',
  },
  is_all_day: {
    type: 'boolean',
    description: 'Whether the time component should be ignored when displaying.',
  },
  type: {
    type: 'string',
    enum: ['call', 'errand', 'task', 'study', 'meet', 'buy', 'exam'],
    description: 'Category of the task.',
  },
  priority: {
    type: 'string',
    enum: ['high', 'normal', 'low'],
    description: 'Priority. Use "high" sparingly.',
  },
  tag: { type: 'string', description: 'Free-form tag. Empty string if none.' },
  subject: {
    type: 'string',
    description: 'Short subject label (e.g. HPC, DL, NLP, BI). Empty string if none.',
  },
  note: { type: 'string', description: 'Optional free-text body. Empty string if none.' },
} as const;

/** Same fields, but every key is nullable for patch semantics —
 *  null means "leave unchanged." Strict mode requires all keys present. */
const TASK_FIELDS_PATCHABLE = {
  title: { type: ['string', 'null'] },
  due_at: { type: ['string', 'null'] },
  is_all_day: { type: ['boolean', 'null'] },
  type: { type: ['string', 'null'], enum: ['call', 'errand', 'task', 'study', 'meet', 'buy', 'exam', null] },
  priority: { type: ['string', 'null'], enum: ['high', 'normal', 'low', null] },
  tag: { type: ['string', 'null'] },
  subject: { type: ['string', 'null'] },
  note: { type: ['string', 'null'] },
} as const;

const TASK_FIELD_KEYS = Object.keys(TASK_FIELDS_PATCHABLE);

export const TOOLS: ToolDef[] = [
  {
    type: 'function',
    name: 'add_task',
    description:
      'Create a new task. Use this whenever Prajwal asks you to add, remind, schedule, or queue something. Generate a stable kebab-case id like "email-sharma-hpc" or "tell-rohit-mall".',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Kebab-case slug, 3–40 chars, lowercase letters/digits/dashes only. Must be unique. If a conflict happens we will append a counter.',
        },
        ...TASK_FIELDS,
      },
      required: [
        'id',
        'title',
        'due_at',
        'is_all_day',
        'type',
        'priority',
        'tag',
        'subject',
        'note',
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'mark_done',
    description:
      'Toggle is_done on a task. Pass done=true to mark complete, done=false to reopen.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task id (slug).' },
        done: { type: 'boolean' },
      },
      required: ['id', 'done'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'edit_task',
    description:
      'Update one or more fields on an existing task. Pass null for any field you do NOT want to change. Pass a new value for fields you DO want to change.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        patch: {
          type: 'object',
          description:
            'Fields to update. Use null for any key you want to leave unchanged. At least one non-null value must be provided.',
          properties: TASK_FIELDS_PATCHABLE,
          required: TASK_FIELD_KEYS,
          additionalProperties: false,
        },
      },
      required: ['id', 'patch'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'delete_task',
    description:
      'Delete a task entirely. Use only when Prajwal explicitly asks to remove or delete; otherwise prefer mark_done.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'add_comment',
    description:
      'Append a comment to a task. Use this to log progress notes, decisions, or links Prajwal mentions in passing about a specific task.',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['task_id', 'body'],
      additionalProperties: false,
    },
    strict: true,
  },
];

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

/** Execute a tool against Supabase. Returns a serializable result the
 *  model gets back as a function_call_output. */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'add_task': {
        // Avoid id collisions by appending -2, -3, ... if needed.
        let id = String(args.id);
        for (let i = 2; i < 50; i++) {
          const { data: clash } = await supabase
            .from('tasks')
            .select('id')
            .eq('id', id)
            .maybeSingle();
          if (!clash) break;
          id = `${args.id}-${i}`;
        }
        const row = {
          id,
          title: args.title,
          due_at: args.due_at,
          is_all_day: args.is_all_day,
          type: args.type,
          priority: args.priority,
          tag: args.tag ?? null,
          subject: args.subject ?? null,
          note: args.note ?? '',
        };
        const { data, error } = await supabase.from('tasks').insert(row).select().single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, data };
      }

      case 'mark_done': {
        const { data, error } = await supabase
          .from('tasks')
          .update({ is_done: !!args.done })
          .eq('id', String(args.id))
          .select()
          .maybeSingle();
        if (error) return { ok: false, error: error.message };
        if (!data) return { ok: false, error: `No task with id "${args.id}"` };
        return { ok: true, data };
      }

      case 'edit_task': {
        const patch = (args.patch ?? {}) as Record<string, unknown>;
        // Null out the no-op keys (we declared all fields to keep strict
        // schema, but the model may send null to mean "don't change").
        const clean = Object.fromEntries(
          Object.entries(patch).filter(([, v]) => v !== null && v !== undefined),
        );
        if (Object.keys(clean).length === 0) {
          return { ok: false, error: 'patch is empty — nothing to update' };
        }
        const { data, error } = await supabase
          .from('tasks')
          .update(clean)
          .eq('id', String(args.id))
          .select()
          .maybeSingle();
        if (error) return { ok: false, error: error.message };
        if (!data) return { ok: false, error: `No task with id "${args.id}"` };
        return { ok: true, data };
      }

      case 'delete_task': {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', String(args.id));
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: { id: args.id, deleted: true } };
      }

      case 'add_comment': {
        const { data, error } = await supabase
          .from('comments')
          .insert({ task_id: String(args.task_id), body: String(args.body) })
          .select()
          .single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, data };
      }

      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
