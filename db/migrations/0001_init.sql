-- ╭───────────────────────────────────────────────────────────────────╮
-- │ 0001 — Initial schema                                             │
-- │ Tasks + comments. Permissive RLS for anon (localhost-only setup,  │
-- │ gated by the app's two-step password). Tighten when we add real   │
-- │ auth.                                                             │
-- ╰───────────────────────────────────────────────────────────────────╯

set search_path to public;

-- ── tasks ───────────────────────────────────────────────────────────
create table if not exists tasks (
  id          text primary key,                            -- short slug ('hpc-1')
  title       text not null,
  due_at      timestamptz not null,
  is_all_day  boolean not null default false,
  type        text not null check (type in ('call','errand','task','study','meet','buy','exam')),
  priority    text not null default 'normal' check (priority in ('high','normal','low')),
  tag         text,                                        -- 'exams' for tape items
  subject     text,                                        -- short label for tape ('HPC','DL','NLP','BI')
  note        text not null default '',
  is_done     boolean not null default false,
  sort_order  integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tasks_due_at_idx  on tasks (due_at);
create index if not exists tasks_tag_idx     on tasks (tag);
create index if not exists tasks_is_done_idx on tasks (is_done);

-- ── comments ────────────────────────────────────────────────────────
create table if not exists comments (
  id          bigserial primary key,
  task_id     text not null references tasks(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists comments_task_created_idx on comments (task_id, created_at);

-- ── updated_at trigger ──────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on tasks;
create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────
alter table tasks    enable row level security;
alter table comments enable row level security;

drop policy if exists "anon all on tasks"    on tasks;
drop policy if exists "anon all on comments" on comments;

create policy "anon all on tasks"    on tasks    for all to anon using (true) with check (true);
create policy "anon all on comments" on comments for all to anon using (true) with check (true);

-- ── realtime publication ────────────────────────────────────────────
-- Add tables to the supabase_realtime publication so the JS client
-- can subscribe to changes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    execute 'alter publication supabase_realtime add table tasks';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then
    execute 'alter publication supabase_realtime add table comments';
  end if;
end$$;
