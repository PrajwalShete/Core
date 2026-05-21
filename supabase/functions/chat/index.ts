// ╭───────────────────────────────────────────────────────────────────╮
// │ POST /functions/v1/chat                                           │
// │                                                                   │
// │ Body: { messages: [{role, content}], model?: string }             │
// │                                                                   │
// │ Streams a unified SSE response built on top of the Codex backend. │
// │ Custom event types for the browser:                               │
// │   delta       — { text: string }              — assistant text    │
// │   tool_call   — { name, args, call_id }       — model invoked a   │
// │                                                  Supabase tool    │
// │   tool_result — { call_id, ok, data?, error?} — tool finished     │
// │   error       — { message }                                       │
// │   done        — {}                                                │
// │                                                                   │
// │ Internals:                                                        │
// │ - OAuth refresh via the same chain as the official `codex` CLI.   │
// │ - Persists user message, tool-call+result row, assistant text.    │
// │ - Loops on function_call output until the model stops calling.    │
// ╰───────────────────────────────────────────────────────────────────╯

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { callCodex, refreshTokens, type TokenSet } from './codex.ts';
import { SYSTEM_PROMPT, buildContext } from './prompt.ts';
import { TOOLS, executeTool } from './tools.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SEED_REFRESH = Deno.env.get('OPENAI_CODEX_REFRESH_TOKEN') ?? '';
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const MAX_TOOL_TURNS = 6;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

/* ──────────────────────────────────────────────────────────────────
 * Token management — identical to before, see commit history.
 * ────────────────────────────────────────────────────────────────── */

async function loadTokens(): Promise<TokenSet | null> {
  const { data } = await supabase
    .from('oauth_tokens')
    .select('access, refresh, expires_at, account_id')
    .eq('provider', 'openai_codex')
    .maybeSingle();
  if (data?.refresh) {
    return {
      access: data.access ?? '',
      refresh: data.refresh,
      expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : 0,
      accountId: data.account_id ?? '',
    };
  }
  if (!SEED_REFRESH) return null;
  return { access: '', refresh: SEED_REFRESH, expiresAt: 0, accountId: '' };
}

async function saveTokens(t: TokenSet): Promise<void> {
  const { error } = await supabase.from('oauth_tokens').upsert(
    {
      provider: 'openai_codex',
      access: t.access,
      refresh: t.refresh,
      expires_at: new Date(t.expiresAt).toISOString(),
      account_id: t.accountId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'provider' },
  );
  if (error) {
    console.error('[chat] FAILED TO PERSIST ROTATED TOKENS:', error);
    throw new Error(`Token persist failed: ${error.message}`);
  }
}

async function ensureFreshTokens(): Promise<TokenSet> {
  const cur = await loadTokens();
  if (!cur) throw new Error('No OpenAI Codex refresh token configured');
  if (cur.access && cur.expiresAt - Date.now() > REFRESH_BUFFER_MS) return cur;
  const next = await refreshTokens(cur.refresh);
  await saveTokens(next);
  return next;
}

/* ──────────────────────────────────────────────────────────────────
 * Codex request shaping.
 * ────────────────────────────────────────────────────────────────── */

function toResponsesInput(messages: { role: string; content: string }[]) {
  return messages.map((m) => ({
    type: 'message',
    role: m.role,
    content: [
      {
        type: m.role === 'assistant' ? 'output_text' : 'input_text',
        text: m.content,
      },
    ],
  }));
}

async function fetchLiveContext() {
  const [tasksRes, commentsRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id,title,due_at,is_all_day,type,priority,tag,subject,note,is_done')
      .order('due_at', { ascending: true }),
    supabase
      .from('comments')
      .select('task_id,body,created_at')
      .order('created_at', { ascending: false })
      .limit(25),
  ]);
  return {
    tasks: tasksRes.data ?? [],
    comments: (commentsRes.data ?? []).reverse(),
  };
}

/* ──────────────────────────────────────────────────────────────────
 * SSE event helpers
 * ────────────────────────────────────────────────────────────────── */

interface FunctionCallItem {
  type: 'function_call';
  id?: string;
  call_id: string;
  name: string;
  arguments: string;
}

/** Parse the upstream SSE stream, forward text deltas to `onDelta`,
 *  and return the function_call items present in the final response. */
async function consumeUpstream(
  upstream: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
): Promise<{ functionCalls: FunctionCallItem[]; assistantText: string }> {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let assistantText = '';
  let functionCalls: FunctionCallItem[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);

      let dataPayload = '';
      for (const line of frame.split('\n')) {
        const m = line.match(/^data:\s*(.*)$/);
        if (m) dataPayload = m[1];
      }
      if (!dataPayload || dataPayload === '[DONE]') continue;

      try {
        const obj = JSON.parse(dataPayload) as {
          type?: string;
          delta?: string;
          response?: { output?: unknown[] };
        };
        if (obj.type === 'response.output_text.delta' && typeof obj.delta === 'string') {
          assistantText += obj.delta;
          onDelta(obj.delta);
        }
        if (obj.type === 'response.completed' && Array.isArray(obj.response?.output)) {
          functionCalls = obj.response.output.filter(
            (it): it is FunctionCallItem =>
              !!it && (it as { type?: string }).type === 'function_call',
          );
        }
      } catch {
        /* ignore */
      }
    }
  }
  return { functionCalls, assistantText };
}

/* ──────────────────────────────────────────────────────────────────
 * HTTP handler
 * ────────────────────────────────────────────────────────────────── */

interface ChatBody {
  messages: { role: 'user' | 'assistant'; content: string }[];
  model?: string;
  conversationId?: string;
  sessionId?: string;
  persist?: boolean;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization,content-type,apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: CORS });
  }

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return new Response('No messages', { status: 400, headers: CORS });
  }

  const persist = body.persist !== false;
  const model = body.model ?? 'gpt-5.2';
  const conversationId = body.conversationId ?? crypto.randomUUID();
  const sessionId = body.sessionId ?? crypto.randomUUID();

  let tokens: TokenSet;
  try {
    tokens = await ensureFreshTokens();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  // Persist the user's latest message early — survives a model failure.
  const latest = messages[messages.length - 1];
  if (persist && latest?.role === 'user') {
    await supabase
      .from('chat_messages')
      .insert({ role: 'user', content: latest.content, model });
  }

  const live = await fetchLiveContext();
  const contextBlock = buildContext(new Date(), live.tasks, live.comments);

  // input items evolve across tool-call turns
  let input: unknown[] = [
    {
      type: 'message',
      role: 'developer',
      content: [{ type: 'input_text', text: contextBlock }],
    },
    ...toResponsesInput(messages),
  ];

  // Build the unified SSE stream we hand to the client.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const writeEvent = (event: string, data: unknown) =>
    writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

  (async () => {
    const toolHistory: { name: string; args: unknown; result: unknown }[] = [];
    let finalAssistantText = '';

    try {
      for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
        const upstream = await callCodex(
          tokens,
          {
            model,
            stream: true,
            store: false,
            instructions: SYSTEM_PROMPT,
            input,
            tools: TOOLS,
            // Force JSON-strict-mode tool args. Codex respects this when
            // the tool def has strict:true (we set that on all of ours).
            parallel_tool_calls: false,
          },
          conversationId,
          sessionId,
        );

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => '');
          await writeEvent('error', {
            message: `Codex backend error ${upstream.status}: ${text.slice(0, 300)}`,
          });
          break;
        }

        const { functionCalls, assistantText } = await consumeUpstream(
          upstream.body,
          (chunk) => {
            void writeEvent('delta', { text: chunk });
          },
        );
        finalAssistantText = assistantText;

        if (functionCalls.length === 0) break;

        // Execute each tool, emit events, append to input for next turn.
        for (const fc of functionCalls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(fc.arguments || '{}');
          } catch {
            args = {};
          }
          await writeEvent('tool_call', {
            call_id: fc.call_id,
            name: fc.name,
            args,
          });

          const result = await executeTool(fc.name, args, supabase);
          toolHistory.push({ name: fc.name, args, result });

          await writeEvent('tool_result', {
            call_id: fc.call_id,
            name: fc.name,
            ...result,
          });

          input = [
            ...input,
            fc,
            {
              type: 'function_call_output',
              call_id: fc.call_id,
              output: JSON.stringify(result),
            },
          ];
        }
        // continue the loop — let the model react to the tool outputs.
      }

      await writeEvent('done', {});
    } catch (e) {
      await writeEvent('error', {
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      // persist tool history + final assistant text
      if (persist) {
        if (toolHistory.length > 0) {
          await supabase.from('chat_messages').insert({
            role: 'tool',
            content: 'tool calls',
            tool_calls: toolHistory.map((t) => ({ name: t.name, args: t.args })),
            tool_results: toolHistory.map((t) => ({
              name: t.name,
              result: t.result,
            })),
            model,
          });
        }
        if (finalAssistantText) {
          await supabase.from('chat_messages').insert({
            role: 'assistant',
            content: finalAssistantText,
            model,
          });
        }
      }
      await writer.close();
    }
  })().catch((e) => {
    console.error('[chat] outer error:', e);
  });

  return new Response(readable, {
    headers: {
      ...CORS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});
