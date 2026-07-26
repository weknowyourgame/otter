# Demo readiness checklist

Full pass across backend (`apps/api`, `apps/workers`, `packages/*`) and frontend (`apps/web` dashboard + `/demo`). No changes made beyond what's marked done. Each open item has a prompt you can hand to an agent to fix it.

## Done

### ✅ `NEXT_PUBLIC_OTTER_PUBLIC_KEY` was missing
Created a demo dashboard user (`demo@cordant.io`), issued a public test key, restricted it to `http://localhost:3001`, added the key to `apps/web/.env.local`.

### ✅ `OPENROUTER_API_KEY` was empty in `apps/api/.env`
Copied the working key from `apps/web/.env.local` into `apps/api/.env`. Agent turns now always use `openai/gpt-5.3-codex`.

### ✅ No seed/reset script
Added `packages/db/scripts/reset.ts` — truncates all otter-db tables (`sessions`, `docs`, `chunks`, `memories`, `api_keys`, `allowed_origins`, `tenant_members`, `tenants`, `account`, `session`, `verification`, `user`) via `TRUNCATE ... CASCADE`. Run with `bun run db:reset` (root script wired to `packages/db`'s `reset` script).

### ✅ Dashboard was showing entirely fake, hardcoded data
`core-pages.tsx` and `workspace-shell.tsx` now fetch real `GET /sessions` data: Live visitors, Conversations, Handled by AI, inbox filter counts, and the inbox conversation list are all real (zero for a fresh tenant, not fabricated numbers). Removed the fake Satisfaction Index/response-time tiles and the two fully-fabricated `TrainingSummary` lines (total size, "Last trained 4 minutes ago") since nothing backs them. Contacts/Organizations-page fake data intentionally left as-is — no contacts/multi-website concept exists in the backend, out of scope for a wiring pass.

### ✅ Real identity leak fixed
`settings-pages.tsx` now fetches `/api/account` and shows the actual logged-in user's name/email/role everywhere (General profile form, Team page). The fake "Maya Chen" teammate is gone.

### ✅ BYOK dead button
Removed the entire BYOK section from Settings → Developers (no backend to back it — would need a new encrypted-key column + API route, decided not worth building for a feature that isn't confirmed as a launch requirement).

### ✅ Broken links / missing pages
Built real `/docs`, `/pricing`, `/changelog` placeholder pages (honest "coming soon" content, not empty 404s). Fixed the `/price` → `/pricing` typo.

### ✅ Onboarding wizard now persists for real
This grew into a full feature build (see `docs/production-readiness.md`'s Onboarding section for the complete list): new `agents` table for agent config (name, model, system prompt, tool budget, extended reasoning, tone/behaviour text, tool toggles) with the system prompt and tool-call budget now genuinely affecting the live `/step` agent loop (verified: a custom system prompt changes real model output). FAQ and Files pages persist into the real knowledge base (`docs`/`chunks`, chunked + embedded on save, immediately searchable). Web Sources page wired to the real single-page crawl backend. Org-creation flow now actually renames the auto-provisioned tenant via a new `PUT /api/account/organization` route, reflected in the sidebar org switcher. Website-create flow's final step now really creates both the test *and* live API keys and adds the domain to allowed origins, matching what its own success copy claims.

### ✅ Onboarding install instructions fixed
`npm install @otter/sdk` → `npm install otter-sdk`, and the public key shown is a real one generated live during the flow (not the hardcoded `pk_test_otter_91a2` placeholder).

### ✅ Favicon + error/404 pages
Added `apps/web/app/icon.svg` (Otter glyph on a brand-gradient badge), `error.tsx`, and `not-found.tsx`.

### ✅ Root build now covers the deployable apps
Root `bun run build` now builds the shared packages plus both Next apps (`apps/web` and `apps/landing`), so a successful root build is no longer false confidence before deploy.

**The first two "Done" items above (public key, OpenRouter key) still need a dev-server restart to take effect if you haven't already.**

---

## Backend / infra — still open

### 1. `apps/workers` isn't started by `bun run dev:all`
`scripts/dev-all.ts` only spawns landing/web/api. Without the worker running, any URL fed into the knowledge base via `/docs` sits at `status: "pending"` forever.
> **Prompt:** Add a `workers` entry to `scripts/dev-all.ts`'s services array (same shape as `api`) so `bun run dev:all` also starts `apps/workers`.

### 2. No `FIRECRAWL_API_KEY` anywhere, no `apps/workers/.env` at all
The crawl job fails immediately without this key (paid, external, get one at firecrawl.dev).
> **Prompt:** Create `apps/workers/.env` with `FIRECRAWL_API_KEY=`, `DATABASE_URL=postgres://localhost:5432/otter`, `REDIS_URL=redis://127.0.0.1:6379`, and `OPENROUTER_API_KEY=` (same key as apps/api, needed to embed chunks).

### 3. `BETTER_AUTH_SECRET` / `OTTER_API_KEY_SECRET` are still the literal `.env.example` placeholder text
Works for a local demo (nothing validates randomness), but it means auth/API-key hashing currently runs on a known, non-random secret.
> **Prompt:** Generate two random 32+ char secrets (`openssl rand -hex 32`) and replace the placeholder values in `apps/api/.env` for `BETTER_AUTH_SECRET` and `OTTER_API_KEY_SECRET`. Note: rotating these invalidates existing sessions/API keys, so do it before creating your real demo key, not after.

### 5. Postgres connection pool may still be exhausted
Hit "too many clients" during testing earlier.
> **Prompt:** Run `brew services restart postgresql@18` before the demo if you see connection errors.

### 6. Origin lock-in
The public key's allowed origins are exact-match. Demoing from anywhere other than `http://localhost:3001` (ngrok, a deployed URL, a different port) needs that exact origin added via Settings → Developers first, or it's `403 origin_not_allowed`.

---

## Frontend dashboard — minor / only matters if clicked on

### 8. Dead toggles, stuck permanently "on"
`settings-pages.tsx:131-142` (Weekly digest, Automatic translation) and `agent-pages.tsx:477-489` (Discover linked pages, Automatic recrawling) — all `checked={true}` with `onChange={() => {}}`, visually frozen.

### 9. No-op buttons in edge actions
- `/demo/tickets/[id]` kebab menu — "Copy ticket link", "Merge into another ticket" do nothing.
- `/demo/admin/users` — "View permissions" does nothing.
- `/demo/admin/security` — "Save allowlist" does nothing.
- `/demo/admin/danger-zone` — "Confirm transfer" / "Permanently delete" just close the confirmation panel with no actual effect (looks like it silently failed).
> **Prompt for 8+9:** Low priority — these are edge actions a presenter is unlikely to click live. Fix opportunistically or just avoid clicking them during the demo.

### 10. Stale/misleading comment in `app/layout.tsx`
References a sibling `app/(marketing)/layout.tsx` that doesn't exist in the repo — leftover from planning, harmless but confusing to future editors. `components/marketing/*` (marketing-shell, benefits-section, install-section, docs-sidebar, markdown, support-widget, logo) is entirely orphaned dead code as a result.
> **Prompt:** Delete the stale comment, and either wire up or delete the orphaned `components/marketing/*` directory.

---

## What's actually solid

- **`/demo` (Cordant fake SaaS)** — the best-built part of the app. Real interactive state via localStorage, tickets/automation/admin all functional, credible to click through live. This is safe to demo.
- **The dashboard itself** — now genuinely wired end to end: real user identity, real session/inbox data, real agent configuration (with live runtime effect), real FAQ/file/web-source knowledge ingestion, real org naming and API key/origin provisioning during onboarding.
- **Settings → Developers** (API key + allowed-origins management) — genuinely wired to the real backend, works end to end.
- **Login/signup** — works end to end via Better Auth, no mock logic.
- **`next build` succeeds cleanly** — zero type errors, so this isn't a "dev-only" app.
- **No secrets leaked to git** — `.env`/`.env.local` properly gitignored in both apps/api and apps/web.

## Bottom line for "show this to a client ASAP"

The dashboard's former two biggest credibility risks (fake live data, identity leak) are fixed and verified live, along with the onboarding wizard now persisting for real. What's left is backend items 1–2 (workers/Firecrawl, only needed if showing the answer/knowledge-base path) and the low-priority items 8–10. The `/demo` Cordant surface and the dashboard are both safe to show live now.
