-- ╭───────────────────────────────────────────────────────────────────╮
-- │ 0002 — Chat messages                                              │
-- │ Persistent thread for the in-app AI sidebar. Single global thread │
-- │ for now (no chat_sessions table) — when this becomes multi-thread │
-- │ we add session_id.                                                │
-- ╰───────────────────────────────────────────────────────────────────╯

set search_path to public;

create table if not exists chat_messages (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  role         text not null check (role in ('user','assistant','tool','system')),
  -- jsonb so we can store plain text OR structured blocks
  -- (tool_use / tool_result / multi-part content from the Responses API)
  content      jsonb not null,
  -- structured tool call requests Claude/GPT issued on this turn
  tool_calls   jsonb,
  -- the matching results we executed and handed back
  tool_results jsonb,
  -- usage accounting (for later cost dashboards)
  tokens_in    integer,
  tokens_out   integer,
  -- which model produced this turn (e.g. 'gpt-5.1', 'gpt-5.2-codex')
  model        text
);

create index if not exists chat_messages_created_idx on chat_messages (created_at);
create index if not exists chat_messages_role_idx    on chat_messages (role);

-- ── RLS ─────────────────────────────────────────────────────────────
alter table chat_messages enable row level security;

drop policy if exists "anon read chat"   on chat_messages;
drop policy if exists "anon insert chat" on chat_messages;

-- anon can read + insert (gated by the in-app password); the Edge Function
-- uses service_role and bypasses RLS regardless. Tighten when we add auth.
create policy "anon read chat"   on chat_messages for select to anon using (true);
create policy "anon insert chat" on chat_messages for insert to anon with check (true);

-- ── realtime publication ────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table chat_messages';
  end if;
end$$;
