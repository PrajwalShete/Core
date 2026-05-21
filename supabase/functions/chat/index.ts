// ╭───────────────────────────────────────────────────────────────────╮
// │ POST /functions/v1/chat                                           │
// │                                                                   │
// │ Body: { messages: [{role, content}], model?: string }             │
// │ Streams an SSE response straight from the Codex backend.          │
// │                                                                   │
// │ - Holds the latest access/refresh token pair in an oauth_tokens   │
// │   row so refreshes survive cold starts.                           │
// │ - Refreshes ~5 min before expiry.                                 │
// │ - Persists user + assistant turns to chat_messages.               │
// ╰───────────────────────────────────────────────────────────────────╯

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { callCodex, refreshTokens, type TokenSet } from './codex.ts';
import { SYSTEM_PROMPT, buildContext } from './prompt.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Initial refresh token — set once via `supabase secrets set`. After the
 *  first refresh, the latest token pair lives in the `oauth_tokens` table
 *  (OpenAI rotates refresh tokens, so we cannot keep using the env value). */
const SEED_REFRESH = Deno.env.get('OPENAI_CODEX_REFRESH_TOKEN') ?? '';

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

/** Load the freshest token pair we know about (DB > env seed). */
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
    // If we don't persist the rotated refresh, the chain breaks
    // permanently on the next cold start. Surface loudly.
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

/** Convert our { role, content } message log to Responses-API input items. */
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

/** Fetch the data Core needs to answer every turn: full task list +
 *  the most recent ~25 comments across all tasks. */
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
    comments: (commentsRes.data ?? []).reverse(), // oldest-first reads better
  };
}

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
  // gpt-5.2 is the model the Go/Plus/Pro plans get via Codex backend.
  // gpt-5.1, gpt-5.1-codex etc. are paywalled to higher tiers.
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

  // Persist the user's latest message before the model call —
  // if the call fails, we still have a record of what was asked.
  const latest = messages[messages.length - 1];
  if (persist && latest?.role === 'user') {
    await supabase.from('chat_messages').insert({
      role: 'user',
      content: latest.content,
      model,
    });
  }

  // Pull live state and inject as a developer message at the top of input.
  // Keeping the static SYSTEM_PROMPT in `instructions` (cacheable) and the
  // dynamic context as a separate input item is the right factoring.
  const live = await fetchLiveContext();
  const contextBlock = buildContext(new Date(), live.tasks, live.comments);

  const inputItems = [
    {
      type: 'message',
      role: 'developer',
      content: [{ type: 'input_text', text: contextBlock }],
    },
    ...toResponsesInput(messages),
  ];

  const upstream = await callCodex(
    tokens,
    {
      model,
      stream: true,
      // Codex backend requires `store: false` — it doesn't keep the
      // conversation in OpenAI's storage on subscription accounts.
      store: false,
      instructions: SYSTEM_PROMPT,
      input: inputItems,
    },
    conversationId,
    sessionId,
  );

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return new Response(
      JSON.stringify({
        error: 'Codex backend error',
        status: upstream.status,
        body: text.slice(0, 500),
      }),
      { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  // Tee the upstream stream: one branch goes to the client, the other
  // accumulates text so we can persist the assistant message at the end.
  const [toClient, toStore] = upstream.body.tee();

  if (persist) {
    (async () => {
      const reader = toStore.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // crude SSE parser: collect `data: {...}` lines and pluck text deltas
        for (const line of chunk.split('\n')) {
          const m = line.match(/^data:\s*(\{.*\})$/);
          if (!m) continue;
          try {
            const obj = JSON.parse(m[1]) as { type?: string; delta?: string };
            if (obj.type === 'response.output_text.delta' && typeof obj.delta === 'string') {
              acc += obj.delta;
            }
          } catch {
            /* ignore non-JSON SSE frames */
          }
        }
      }
      if (acc) {
        await supabase.from('chat_messages').insert({
          role: 'assistant',
          content: acc,
          model,
        });
      }
    })().catch((e) => console.error('persist error', e));
  }

  return new Response(toClient, {
    headers: {
      ...CORS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});
