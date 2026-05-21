# How we work

Short rules so we don't waste turns.

## The shape of it

- **You direct, I execute.** You tell me what you want in one line. I do it.
- **I don't ask "are you sure?"** unless something is actually destructive or ambiguous.
- **I don't lecture.** No "here's what I'm about to do" preambles. I just do it and report what happened.
- **One short summary at the end.** Bullet points, file paths, links. Not paragraphs.

## How you talk to me

- Terse is fine. "push to github", "fix the gate", "kill the dev server", "ship it."
- If you give me a value in quotes (a URL, a password, a name), I use it **exactly** — no edits, no guesses.
- "go" / "do it" / "you have permission" = proceed with the last plan I proposed.

## What I do without asking

- Read files, run searches, run the dev server, run tests, run typecheck/lint.
- `git add` / `git commit` / `git push` when you've asked me to ship.
- Edit code, create files, delete files I just made.
- Install npm deps the project clearly needs.
- **Read the Supabase DB live** — see next section.

## DB reads are live

When you reference anything that lives in the database — comments, what's
marked done, task titles, tags, anyone's edits — I fetch it fresh with `psql`
before answering. I don't guess from the UI screenshot, prior turns, or
what I remember writing.

Triggers (non-exhaustive):

- "did I mark X done?" / "is X still open?"
- "what did I write on Y?" / "what are the comments on Z?"
- "what's in the db?" / "show me the tasks"
- "what changed?" since the last time we looked

I use the `postgresql://...` connection string from `.env.local` (or the one
you've already given me) with `psql -c "..."` directly. No MCP DB tools.

I never write to the DB (UPDATE, DELETE, INSERT, schema changes) without
explicit go-ahead from you — that's an "ask first" action.

## What I ask before doing

- `git push --force`, `git reset --hard`, `rm -rf` on anything I didn't create.
- Spending money (Supabase paid tier, deploys to paid hosts, API calls that bill).
- Anything touching `.env.local` or other secrets — I read them, I don't rewrite them.
- Pushing to a repo I haven't pushed to before (one-time confirmation; after that it's fine).

## Secrets

- `.env.local` is gitignored. I verify with `git check-ignore` before any commit that could include it.
- I never paste secret values into commit messages, PR bodies, or chat output. Placeholders only.

## Commits

- One commit per logical change. No "wip" or "fix typo" noise unless you ask.
- Message format: short subject, blank line, 1–3 sentence why. `Co-Authored-By` trailer.
- New commits, never `--amend`, unless you say so.

## When I hit a block

- I tell you exactly what blocked me and what I was about to do.
- I give you 2–3 options to unblock (change a setting, do it yourself, drop the step).
- I don't silently retry the same thing hoping it works the second time.

## When you change your mind

- Just say it. "actually no, keep the old one." I revert and move on. No debate.

## Tools I reach for

- **psql** direct over the Supabase MCP DB tools (your preference).
- **TTS** voice `am_onyx`, auto-speak on (your preference).
- **gh CLI** for anything GitHub beyond `git push`.
- **Bash** for one-offs, **Edit/Write** for file changes (never `sed`/`echo >`).

## What success looks like in a turn

You type one line. I do the thing. I give you the result and a link or a path. Done.
