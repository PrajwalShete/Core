-- ╭───────────────────────────────────────────────────────────────────╮
-- │ 0003 — OAuth tokens                                               │
-- │ Holds the latest access+refresh token pair per provider so the    │
-- │ Edge Function can pick up rotated refresh tokens across cold      │
-- │ starts. RLS is denied for anon — only service_role (Edge          │
-- │ Function) ever reads or writes this table.                        │
-- ╰───────────────────────────────────────────────────────────────────╯

set search_path to public;

create table if not exists oauth_tokens (
  provider     text primary key,                  -- 'openai_codex'
  access       text not null default '',
  refresh      text not null,
  expires_at   timestamptz,
  account_id   text not null default '',
  updated_at   timestamptz not null default now()
);

-- ── RLS — deny anon entirely ────────────────────────────────────────
alter table oauth_tokens enable row level security;
-- No policies = no anon access. service_role bypasses RLS, which is
-- exactly what we want.
