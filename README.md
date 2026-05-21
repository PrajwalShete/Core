# dashboard

Personal "what's on" dashboard. One screen, designed to live on a monitor.
Tasks live in Supabase; comments stack as a thread per task.

## Stack

- Vite + React 19 + TypeScript (strict)
- Tailwind CSS v4
- Supabase (Postgres + Realtime)
- TanStack Query for server state
- React Router
- Radix UI primitives (Dialog)
- Sonner for toasts

## Setup

```sh
cp .env.example .env.local
# fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_APP_PASS_STEP_1 / VITE_APP_PASS_STEP_2

npm install
npm run dev
```

## Database

Schema and seed live in `db/`. To apply on a fresh project:

```sh
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"   # wherever your psql lives
PGPASSWORD='<db-password>' psql "<pooler-url>" -f db/migrations/0001_init.sql
PGPASSWORD='<db-password>' psql "<pooler-url>" -f db/seed.sql
```

New schema changes: add a new file under `db/migrations/` with an incrementing prefix
(e.g. `0002_add_X.sql`) and apply it the same way.

## Layout

```
src/
  app/           providers, routing, root layout
  features/
    tasks/       data + UI for the dashboard items
    comments/    the per-task comment thread
    auth/        two-step password gate
  shared/        cross-feature utilities (supabase client, time helpers, UI primitives)
  styles/        global CSS (design tokens, tailwind import)
  types/         generated DB types
db/
  migrations/    versioned SQL migrations, applied in order
  seed.sql       initial data
```

## Conventions

- Feature folders own their own types, hooks, components, and API layer.
- All Supabase access goes through TanStack Query — no `useEffect`-based fetching.
- DB-changing UI uses mutations with optimistic updates where worth it.
- `db/migrations/` is the source of truth for schema — no schema edits outside that folder.
