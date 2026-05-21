# Core — project context for Claude

> Read this first. WORKFLOW.md covers _how we work_; this covers _what we've built_.

## TL;DR

**Core** is a single-user task dashboard for Prajwal Shete (engineering student, India, currently in exam season). It has two parts:

1. **The dashboard** — a cockpit-style view of his day. Tasks, comments, an exam tape strip across the bottom.
2. **The Core sidebar** — an AI co-pilot that lives in a right-side panel (or a bottom sheet on mobile). It talks to ChatGPT via the official `codex` OAuth chain and answers questions about the day. Read-only for now — tool use (write actions) is the next planned upgrade.

Stack: **Vite + React + TypeScript + Tailwind v4** on the front, **Supabase Postgres + Edge Functions (Deno)** on the back, **GPT-5.2 → 5.4** via the **ChatGPT Codex backend** (subscription auth, not API key).

## The Supabase project

- **Name:** Track
- **Ref:** `hhqdmolvgljzgonddrvn`
- **Region:** South Asia (Mumbai)
- **URL:** `https://hhqdmolvgljzgonddrvn.supabase.co`
- **Linked locally:** yes (`supabase link` already done). `supabase db push --linked --yes` works without a password prompt.
- **Management API:** the Supabase PAT in macOS keychain (`security find-generic-password -s "Supabase CLI" -a "access-token" -w`) is restricted — cannot run arbitrary SQL via Management API. For SQL, use `supabase db push` with a migration file, or paste into the Studio SQL editor.

## DB schema

| Table | Purpose | RLS for anon |
|---|---|---|
| `tasks` | The 16+ tasks Prajwal tracks. Drives the dashboard. | `ALL` allowed (gated by app password) |
| `comments` | Threaded comments per task. | `ALL` allowed |
| `chat_messages` | Persistent Core thread. `content` is jsonb (usually a string). The table already has unused `tool_calls`/`tool_results` jsonb columns — reserved for the upcoming tool-use upgrade. | SELECT, INSERT allowed |
| `oauth_tokens` | Rotating Codex access+refresh+expires+account_id. Single row keyed on `provider='openai_codex'`. | **No anon policy — service-role only.** |

Migrations live in **two places** for historical reasons:
- `db/migrations/000N_*.sql` — the canonical source (committed to git)
- `supabase/migrations/<timestamp>_*.sql` — copies used by `supabase db push`

Current applied migrations:
1. `0001_init` — tasks + comments + RLS + realtime publication
2. `0002_chat_messages` — chat thread table
3. `0003_oauth_tokens` — Codex token storage

**Drift to know about:** the remote DB ALSO has migration `20260522030000_chat_delete_policy` applied (anon DELETE on `chat_messages`) — pushed during local development but not yet committed to git. Future tool-use commit will land it. Also: a one-off `20260522000400_seed_codex_token.sql` was applied then **reverted in history** (`supabase migration repair --status reverted`) — so a fresh `db push` may complain about that ID and need a repair before it proceeds. Same pattern when applying a future seed.

## How the AI auth works (READ THIS)

We do **not** use an OpenAI API key. We use the same OAuth chain the official `codex` CLI uses, talking to `chatgpt.com/backend-api/codex/responses`. This piggybacks on Prajwal's **ChatGPT Go** subscription.

Key facts:

- **OAuth client ID** (Codex CLI, hardcoded everywhere): `app_EMoamEEZ73f0CkXaXp7hrann`
- **Token endpoint:** `https://auth.openai.com/oauth/token`
- **Codex backend:** `https://chatgpt.com/backend-api/codex/responses`
- **Required headers** beyond `Authorization: Bearer`:
  - `OpenAI-Beta: responses=experimental`
  - `originator: codex_cli_rs` (impersonates the CLI — without this, 401)
  - `chatgpt-account-id: <from JWT claim>`
  - `session_id`, `conversation_id` (uuids, generated per request)
- **Body:** must include `store: false` — subscription accounts can't use OpenAI's response store.
- **Model:** request `gpt-5.2`. The backend routes it to **gpt-5.4** for the Go plan. Don't request `gpt-5.1` or `gpt-5-codex` — paywalled to higher tiers, returns "model not supported."
- **Tokens rotate every refresh.** OpenAI invalidates the prior refresh on each use. Whoever holds the latest must persist it back.

### The race-condition gotcha

**Critical:** if Prajwal runs `codex` locally on his Mac while the server is also using the chain, they fight over rotation. Whichever refreshes second gets a "refresh_token_invalidated" 401 and the chain dies. **Both sides cannot share the same chain.**

Mitigation: he's been told (in our conversation) to leave `codex` alone locally. If the chain dies, recovery is:

```bash
# on his Mac
codex logout
codex login
python3 -c "import json; print(json.load(open('/Users/egoist/.codex/auth.json'))['tokens']['refresh_token'])"
```

Then re-seed via a one-off migration that **must not be committed** (see "Token re-seed" below).

### Token storage

- **Supabase Function secret:** `OPENAI_CODEX_REFRESH_TOKEN` — set via `supabase secrets set`. Used only on first cold-start when `oauth_tokens` is empty.
- **`oauth_tokens` table:** the canonical home after first refresh. Row schema: `provider, access, refresh, expires_at, account_id, updated_at`. Service-role only.
- **Refresh logic:** in `supabase/functions/chat/index.ts:ensureFreshTokens`. Refreshes 5 min before expiry, throws loudly if persist fails.

### Token re-seed procedure

Use this whenever the chain breaks:

```python
# Generate the seed migration locally — DO NOT COMMIT.
python3 << 'PY'
import json, base64
d = json.load(open('/Users/egoist/.codex/auth.json'))
t = d['tokens']
payload = json.loads(base64.urlsafe_b64decode(t['access_token'].split('.')[1] + '=='))
acc = t['access_token'].replace("'", "''")
ref = t['refresh_token'].replace("'", "''")
open('supabase/migrations/<NEW_TS>_seed_codex_token.sql', 'w').write(
f"""insert into oauth_tokens (provider, access, refresh, expires_at, account_id, updated_at)
values ('openai_codex', '{acc}', '{ref}', to_timestamp({payload['exp']}), '{t['account_id']}', now())
on conflict (provider) do update set
  access = excluded.access, refresh = excluded.refresh,
  expires_at = excluded.expires_at, account_id = excluded.account_id,
  updated_at = now();
""")
PY
```

Then `supabase db push --linked --yes` and **immediately** `rm` the file. The `.gitignore` has a belt-and-braces rule (`supabase/migrations/*seed_codex*.sql`) but don't rely on it.

After applying, also update the Function secret:
```bash
supabase secrets set OPENAI_CODEX_REFRESH_TOKEN='rt_...'
```

## The Edge Function (`supabase/functions/chat/`)

| File | Role |
|---|---|
| `index.ts` | HTTP handler. Token refresh, Codex streaming, persistence. |
| `codex.ts` | OAuth client + Codex backend caller. Has CLIENT_ID, TOKEN_URL, CODEX_BASE constants. |
| `prompt.ts` | `SYSTEM_PROMPT` (Core's identity/voice/rules) + `buildContext()` (per-turn live state injector). |

**Deploy:** `supabase functions deploy chat --no-verify-jwt`

**Function URL:** `https://hhqdmolvgljzgonddrvn.supabase.co/functions/v1/chat`

The function tees Codex's SSE stream directly to the client (vendor format, e.g. `response.output_text.delta` events) and persists the final assistant text to `chat_messages` after the stream completes. Read-only — no tool execution yet.

## The frontend

```
src/
├── app/
│   ├── App.tsx              — gates with Gate then renders Dashboard
│   └── providers.tsx        — QueryClient, supabase realtime subscription
├── features/
│   ├── auth/Gate.tsx        — two-step password gate (9822 → 8805); auto-submits on 4 digits
│   ├── tasks/
│   │   ├── api.ts, hooks.ts, types.ts, bucketing.ts
│   │   └── components/
│   │       ├── Dashboard.tsx — outer layout, main column + ChatSidebar
│   │       ├── TopBar.tsx    — date · pills (TODAY/DONE/OVERDUE/AHEAD) · clock (12h + AM/PM)
│   │       ├── Hero.tsx      — bordered panel, "NEXT UP" eyebrow, shrunk type
│   │       ├── Quads.tsx     — 3-col panels (OVERDUE/TODAY/AHEAD or TODAY/TOMORROW/LATER)
│   │       ├── Item.tsx      — single row, status dot
│   │       ├── Tape.tsx      — full-width exam strip
│   │       ├── TaskPanel.tsx — click-to-open detail panel with comment thread
│   │       └── Footer.tsx    — live indicator + hint strip
│   └── chat/
│       ├── api.ts            — streamChat, fetchHistory
│       ├── hooks.ts          — useChat (manages pending state)
│       ├── types.ts
│       └── components/
│           ├── Sidebar.tsx        — desktop: collapsible right panel
│           ├── ChatLauncher.tsx   — mobile: docked bar + vaul bottom sheet
│           ├── Message.tsx        — bubble (YOU / CORE eyebrow + content)
│           └── Composer.tsx       — autosize textarea, ⏎ send / ⇧⏎ newline
├── shared/
│   ├── lib/supabase.ts       — client (uses anon key from env)
│   ├── lib/cn.ts             — class name helper
│   ├── lib/time.ts           — date formatters (MONTHS_UPPER, DOWS_UPPER, fmtCountdown, etc.)
│   └── hooks/useNow.ts       — ticking now
└── styles/index.css          — Tailwind v4 + design tokens + .panel utilities
```

### Design language

- Dark by default, system preference respected.
- Square corners, hairline borders (`border-rule`), corner ticks (`.panel-ticks`) on key panels.
- Typography: SF Pro / Inter system stack. Tabular numerals everywhere a count/date/time appears.
- Color tokens: `bg`, `ink`, `ink-soft`, `ink-quiet`, `rule`, `accent` (orange). Defined in `src/styles/index.css` `@theme`.
- Density inside panels, breathing room between panels. Edge-to-edge — no max-width container.

### App password gate

Two-step, hard-coded in env:
- `VITE_APP_PASS_STEP_1=9822`
- `VITE_APP_PASS_STEP_2=8805`

Each step auto-submits on 4-digit input — no Enter required.

## What Core can do (right now)

- Answer questions grounded in the live task list + comments injected each turn.
- Suggest priorities, study plans, breakdowns.
- Format new task entries Prajwal can paste (fenced \`task\` block + matching SQL).

It **cannot** mutate the DB yet — that ships in the tool-use upgrade (see "What's intentionally NOT built yet"). The system prompt explicitly tells the model not to pretend it did so.

## Live context injection

Every chat turn, the function fetches the full task list + last 25 comments and prepends them as a `developer`-role input message before the user's turn (see `prompt.ts:buildContext`). Core therefore can **never** be stale. Don't try to "cache" or skip this — it's cheap and it's what makes the co-pilot feel grounded.

## Known good defaults

- Dev server: `npm run dev` → `http://localhost:5173`
- Typecheck: `npx tsc --noEmit`
- Function deploy: `supabase functions deploy chat --no-verify-jwt`
- Migration apply: `supabase db push --linked --yes`

## Gotchas / things future Claude should NOT do

1. **Don't put secrets in migration files that get committed.** The `.gitignore` blocks `*seed_codex*.sql` and `*seed_tokens*.sql` patterns under `supabase/migrations/`. Use those naming conventions for any temp credential migration.
2. **Don't paste tokens (refresh, access, JWT) into chat messages.** They're working credentials. If a token must be shared, rotate it after.
3. **Don't change the `originator` header.** Removing or modifying `codex_cli_rs` will get the Codex backend to reject the request as not-a-real-CLI.
4. **Don't request `gpt-5.1`, `gpt-5-codex`, `gpt-5.2-codex` etc.** on the ChatGPT Go plan — they're paywalled. Stick with `gpt-5.2` (routes to 5.4).
5. **Don't put `instructions` in the input items.** It belongs in the top-level `instructions` field of the request — putting it inline disables prompt caching.

## Mobile / PWA

The app has **two layouts** chosen at runtime via `useIsMobile()` (matches `(max-width: 767.98px)`):

**Desktop** — the cockpit panel layout, sidebar docked at 380px on the right.

**Mobile** — single scrolling column under a sticky TopBar; sidebar replaced by a docked "Ask Core…" bar at the bottom that opens a `vaul` bottom sheet. `TaskPanel` also becomes a `vaul` bottom sheet (drag-to-dismiss).

Foundation pieces (don't break these):

- `index.html` has `viewport-fit=cover` (required for `env(safe-area-inset-*)`) plus iOS/Android PWA meta tags.
- `public/manifest.webmanifest` makes it installable.
- `src/styles/index.css` defines `.pt-safe`, `.pb-safe`, `.pb-safe-0`, `.h-svh`, `.h-dvh`, `.min-h-svh`, `.min-h-dvh`, `.scrollx`.
- We use **svh** (stable) for shells and **dvh** only for the chat sheet (so it tracks the dynamic viewport when keyboard / chrome animates).
- `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` on all buttons.
- `overscroll-behavior: none` on body to prevent rubber-band into browser.
- `src/features/chat/components/ChatLauncher.tsx` owns the mobile chat UX.
- `src/shared/hooks/useMediaQuery.ts` — `useIsMobile()` lives here.

### Mobile component variants

| Component | Mobile behaviour |
|---|---|
| TopBar | Two-row panel: date + clock on top, horizontally scrollable status pills below |
| Hero | Same panel, smaller type floor (`clamp(1.5rem, 6.4vw, 3.4rem)`) |
| Quads | Stacks vertically as full-width panels (`grid-cols-1`) |
| Tape | Horizontal scroll, fixed `5.5rem` day-cell width |
| Footer | Hidden (desktop only) |
| Sidebar | Hidden (`md:flex`) — mobile uses ChatLauncher |
| ChatLauncher | Docked input bar (bottom, `pb-safe`) → tap → vaul drawer at 92dvh |
| TaskPanel | vaul drawer at 92dvh (mobile) vs Radix right-side dialog (desktop) |

## What's intentionally NOT built yet

(Per Prajwal's scope choices — don't bolt these on without asking.)

- **Tool use** — Core can't mutate the DB yet. Function-calling + SSE tool events + UI chips + `/clear` slash command + DB delete policy are all wired up locally on a separate uncommitted commit; ship that next.
- Voice input
- Multi-user support (chat is single global thread)
- Personality / settings UI
- Realtime subscription on `chat_messages` (we refetch instead — works fine for single-user)
- Prompt caching tuning (the structure supports it; we haven't enabled the cache control yet)
- Pull-to-refresh on mobile (realtime sub already updates tasks)
- Haptics (web vibration API support is patchy)
- Service worker for offline (manifest only — installable but online-only)
- PNG icons (the manifest references `/favicon.svg`; iOS/Android sometimes prefer PNGs at specific sizes — add them if installability matters)

## What worked, what to keep

- **Edge function holding tokens** — clean separation, OpenAI key never leaves the server.
- **Live context injection over conversation IDs** — Codex's conversation memory is opaque; rebuilding context from our own DB each turn is honest and debuggable.
- **`supabase db push --linked --yes` is the workflow** — DB password not needed once project is linked.
