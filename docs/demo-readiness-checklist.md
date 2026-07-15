# Demo readiness checklist

What's left before showing Otto to a client. Investigated by reading the codebase and current `.env`/`.env.example` files — no changes made. Each item has a prompt you can hand to an agent to fix it.

## Blockers — demo won't work at all without these

### 1. Missing `NEXT_PUBLIC_OTTO_PUBLIC_KEY`

`apps/web/.env.local` doesn't have it, and `otto-mount.tsx` sends `publicKey: undefined` without it. The widget will get `401 invalid_api_key` on every request — chat won't work at all on `/demo`.

**Prompt:**
> Sign up a dashboard user, go to Settings → Developers, create a public test key, add `http://localhost:3001` to its allowed origins, and put the raw key into `apps/web/.env.local` as `NEXT_PUBLIC_OTTO_PUBLIC_KEY`.

### 2. `OPENROUTER_API_KEY` is empty in `apps/api/.env`

The key that matters is set in `apps/web/.env.local`, but that's dead now since `apps/web` just proxies to `apps/api`, and *apps/api's own* `.env` has it blank. Without it, Otto only runs the deterministic keyword fallback — no real reasoning, weaker demo.

**Prompt:**
> Copy the OpenRouter key from `apps/web/.env.local` into `apps/api/.env`'s `OPENROUTER_API_KEY` (and set `AGENT_MODEL` to match if you want the same model).

## If you want the "answer questions from docs" pitch, not just "watch it click things"

### 3. `apps/workers` isn't started by `bun run dev:all`

`scripts/dev-all.ts` only spawns landing/web/api. Without the worker running, any URL fed into the knowledge base via `/docs` sits at `status: "pending"` forever.

**Prompt:**
> Add a `workers` entry to `scripts/dev-all.ts`'s services array (same shape as `api`) so `bun run dev:all` also starts `apps/workers`.

### 4. No `FIRECRAWL_API_KEY` anywhere

`apps/workers` has no `.env` file at all yet, and the crawl job fails immediately without this key (paid, external).

**Prompt:**
> Create `apps/workers/.env` with `FIRECRAWL_API_KEY=`, `DATABASE_URL=postgres://localhost:5432/otto`, `REDIS_URL=redis://127.0.0.1:6379`, and `OPENROUTER_API_KEY=` (same key as apps/api, needed to embed chunks). Get a Firecrawl key from firecrawl.dev if you don't have one.

## Lower priority / polish

### 5. Postgres connection pool may still be exhausted

Hit "too many clients" during testing and didn't restart Postgres to avoid killing anyone's live session.

**Prompt:**
> Run `brew services restart postgresql@18` before the demo if you see connection errors.

### 6. No seed/reset script

There's already a leftover tenant + rows in the `otto` DB from testing. Fine to demo with, but not a clean slate.

**Prompt:**
> Write a small script that truncates all otto-db tables (sessions, docs, chunks, memories, api_keys, allowed_origins, tenant_members, tenants, account, session, verification, user) for a clean demo reset.

### 7. Origin lock-in

The public key's allowed origins are exact-match (`http://localhost:3001`, not a wildcard). If you demo from a different port/host (e.g. ngrok, a deployed URL, or just a different port), the widget will get `403 origin_not_allowed` until you add that exact origin via Settings → Developers.

---

Items 1–2 are the only hard blockers for a basic "Otto acts on the page" demo. 3–4 only matter if you're also showing the Q&A/knowledge-base side.
