-- ╭───────────────────────────────────────────────────────────────────╮
-- │ 0004 — Allow anon to clear chat history                           │
-- │ Adds the missing DELETE policy on chat_messages so the in-app     │
-- │ /clear command actually works. Same trust posture as the other   │
-- │ chat policies — single-user app, gated by the password.           │
-- ╰───────────────────────────────────────────────────────────────────╯

set search_path to public;

drop policy if exists "anon delete chat" on chat_messages;
create policy "anon delete chat" on chat_messages for delete to anon using (true);
