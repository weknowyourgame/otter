# Production readiness — full feature audit

Every feature across `apps/web`, `apps/api`, `apps/workers` (+ `packages/*`), what state it's actually in, and what's needed to call it done and prod-ready — not just demo-safe. Read-only investigation, no changes made except where noted. Each gap has a prompt.

This is a bigger bar than `docs/demo-readiness-checklist.md` (which only covers "won't embarrass you live"). Some items here overlap with that file; where they do, this doc goes further into what "actually done" requires.

---

## apps/api

### Auth (Better Auth — email/password)
**Works.** Signup, login, session cookies, tenant auto-provisioning on signup all function correctly, verified live.
**Gaps for prod:**
- No email verification flow — `emailAndPassword.enabled: true` but no `sendVerificationEmail`/`sendResetPassword` configured in `auth.ts`. Anyone can sign up with an email they don't own.
- No password-reset flow at all — a locked-out user has no recovery path.
- `BETTER_AUTH_SECRET` is still literally the `.env.example` placeholder text in `apps/api/.env`.
> **Prompt:** Add an email provider (Resend, SES, or similar) to `apps/api`, wire `sendVerificationEmail` and `sendResetPassword` into `auth.ts`'s `emailAndPassword`/`emailVerification` config, and generate a real random `BETTER_AUTH_SECRET` before any real user signs up.

### Tenant management (`access.ts`)
**Works** — auto-provisioning, `owner`/`member` roles. **✅ Invite flow built.** New `tenant_invites` table (token, role, 7-day expiry). `POST /api/account/team/invite` creates an invite + sends the email (via the Resend integration from the email-verification work); `GET /api/invites/:token` previews it publicly; `POST /api/invites/:token/accept` (session-only, deliberately not `requireDashboard`) joins the tenant. `DELETE /api/account/team/:userId` removes a member, blocked from removing the last owner. New `apps/web/app/invite/[token]` page handles both existing-user sign-in and brand-new signup.
**Real bug found and fixed during testing:** Better Auth's `databaseHooks.user.create.after` auto-creates a solo tenant for *every* signup unconditionally — including someone signing up specifically to accept an invite — which made every new-user invite acceptance fail with `user_already_in_tenant`. Fixed by having `acceptTenantInvite` detect a still-solo auto-created tenant (the user is its only member) and absorb it into the invited tenant instead of blocking; a tenant with other real members is still correctly protected. Verified live end to end, including the last-owner guard and member removal.

### API keys (`api-keys.ts`)
**Works** — generation, HMAC hashing, masking, revocation, all verified live. `OTTO_API_KEY_SECRET` has the same placeholder-secret gap as `BETTER_AUTH_SECRET`.
**Gap:** no per-key usage limits or rate limiting (see below) — a leaked public key has no request cap.
> **Prompt:** Generate a real `OTTO_API_KEY_SECRET`. Separately, decide on and implement a per-key request budget (see rate limiting item).

### Allowed origins
**Works**, exact-match only (no wildcards/subdomains), verified live. This is a deliberate, reasonable design — flagging only because a customer with `*.vercel.app` preview deploys will find it tedious, not because it's broken.
> **Prompt:** Only if needed — add optional wildcard/pattern support to `normalizeOrigin`/the origin check in `requireAgentKey` for preview-deploy domains.

### Agent loop (`POST /step`, `GET /ws`)
**Works** — verified live end to end: tool-calling loop, knowledge search, memory, tenant scoping, pause/resume, all confirmed with real requests.
**Gaps for prod:**
- **No rate limiting anywhere in apps/api.** Every route — `/step`, `/ws`, auth, key creation — is uncapped. One misbehaving client (or a leaked key) can hit OpenRouter/Postgres/Redis without limit. This is the single biggest production gap in the backend.
- **No per-tenant usage/cost tracking.** Nothing records how many LLM calls or tokens a tenant has used — no way to enforce a plan limit even though the dashboard UI displays fake usage numbers implying this exists.
- `MAX_TOOL_RESOLUTION_ITERATIONS` (3) and the client-side step cap bound a single task, but there's no cap on *tasks per session* or *sessions per tenant per hour*.
- WS multi-instance fan-out was deliberately deferred (documented in the code) — fine for one server, but if apps/api ever scales to 2+ instances, sessions on different instances won't see each other's WS events. Not an issue until you actually need multiple instances.
> **Prompt:** Add rate limiting (e.g. a Redis-backed token bucket keyed by API key / tenant / IP) to `requireAgentKey` and `requireDashboard` in `apps/api/src/index.ts`. Separately, add token/request usage tracking per tenant (new table or reuse `sessions`) so the dashboard's usage numbers can become real instead of hardcoded.

### Knowledge base (`/docs`)
**Works** for single-page ingestion, verified live (create → crawl → chunk → embed → search).
**Gaps for prod:**
- Single-page scrape only — no whole-site crawl (cossistant's reference implementation supports this; Otto's was deliberately scoped down). A client with a 50-page docs site has to submit 50 URLs one at a time.
- No re-crawl/refresh — a doc ingested once never updates even if the source page changes.
- No per-tenant storage limits — nothing stops a tenant from ingesting unlimited docs.
> **Prompt:** Decide whether whole-site crawling is in scope for launch. If yes, extend `apps/workers/src/services/firecrawl.ts` to use Firecrawl's `/crawl` + `/map` endpoints (reference: `cossistant/apps/api/src/services/firecrawl.ts`) instead of single-page `/scrape`. Add a "re-crawl" action to `POST /docs/:id/refresh`. Add a doc-count or size cap per tenant in `apps/api/src/index.ts`'s `POST /docs`.

### Request validation (zod)
**Done** — every route body validated, verified with real invalid/valid inputs.

### Database (Postgres via `otto-db`)
**Works**, migrated from SQLite, verified live.
**✅ Real migration tooling added.** `drizzle-kit` generates migrations into `packages/db/drizzle/`, `connection.ts` now runs `drizzle-orm`'s `migrate()` against that folder instead of hand-rolled `CREATE TABLE`/`ALTER TABLE` blocks. The existing dev database was baselined via a one-time `packages/db/scripts/baseline-migrations.ts` (marks the initial migration as already applied without re-running its DDL against tables that already exist — safe only to run once, never against a genuinely fresh database). To make a schema change going forward: edit `schema.ts`, run `bun run --cwd packages/db db:generate`, commit the generated migration — it applies automatically on next connect.
**Remaining gaps:**
- No backup strategy documented or configured for the Postgres instance.
- No connection pooling limits configured beyond Bun.SQL's defaults — worth capping explicitly before production traffic (we hit "too many clients" during local testing alone).
> **Prompt:** Document a Postgres backup approach (managed provider snapshot, or `pg_dump` cron) before going live, and configure explicit connection pool limits.

### Observability
**✅ Structured logging added.** `pino` (pretty-printed in dev, JSON in prod) replaces every `console.*` call in `apps/api/src`. A Hono `app.onError` handler now catches unhandled route errors, logs them structurally with method/path context, and returns a generic 500 instead of leaking internals — verified live.
**Remaining gap:** No error-tracking service (Sentry or similar) wired in — deliberately skipped for now (needs a DSN, a product decision on which service to use). No request tracing or metrics/dashboards for the API itself either.
> **Prompt:** Once a Sentry (or equivalent) DSN is available, wire it into the `app.onError` handler already in place — it already has the exact call site logging every unhandled error, just needs the SDK call added alongside the `logger.error`.

---

## apps/workers

### Web-crawl worker
**Works** — verified live (Firecrawl scrape → chunk → embed → store), including the graceful "not configured" failure path. **✅ Health endpoint added** — `Bun.serve` on `WORKERS_HEALTH_PORT` (default 8788), `/health` returns 200, verified live.
**Remaining gaps:**
- No dead-letter handling beyond BullMQ's default retry/fail — a permanently-broken URL just retries and fails silently from the tenant's perspective (doc sits at `status: "failed"` with no notification).
- No concurrency/rate limits against Firecrawl itself beyond BullMQ's `concurrency: 2` — fine at small scale, but no backpressure if many tenants ingest simultaneously.
> **Prompt:** Consider notifying the tenant (email, or at least a dashboard-visible flag) when a doc permanently fails.

### Repo hygiene issue found
**✅ Fixed.** `apps/workers/dump.rdb` removed from git, `*.rdb` added to the root `.gitignore`.

---

## apps/web

### Login / signup
**Works** end to end, verified. No gaps beyond the auth-email items already listed under apps/api (no verification, no password reset).

### Dashboard (sessions, metrics)
**Wired to real data.** `core-pages.tsx` and `workspace-shell.tsx` now fetch real `GET /sessions` data — Live visitors, Conversations, Handled by AI %, inbox filter counts (active/done), and an actual conversation list, all verified live against a real signup. Removed the fabricated Satisfaction Index / response-time tiles and `TrainingSummary`'s hardcoded total-size and "Last trained 4 minutes ago" lines since nothing backed them.
**Remaining gap:** Contacts and Organizations-page website lists are still fake — no `contacts` table or multi-website concept exists in the backend at all, a materially different (and larger) feature than wiring an existing endpoint.

### Settings → General / Team / Plan / Notifications / Billing
- **General**: ✅ fixed — now reads `/api/account`, shows the real logged-in user.
- **Team**: ✅ fully real now — identity leak fixed, invite flow wired to the real backend (send/list/revoke invites, remove members), verified live end to end (see apps/api Tenant management above).
- **Plan & Usage**: ✅ real now — new `usage_events` table records every LLM call's token usage (`packages/core`'s `requestNextAction` returns real `usage` from OpenRouter's response, `engine.ts` records it per-tenant). `GET /api/account/usage` sums a rolling 30-day window (requests, total tokens, conversations, team members — all real). Verified live: a real `/step` call produced a real Postgres row with real token counts. Plan-tier limit numbers (200 messages, 20 conversations, 3 seats, 1M tokens) are kept as stated free-tier design targets, not enforced anywhere yet — that's the rate-limiting/billing layer's job, not this one's.
- **Billing**: no payment provider integrated anywhere in the codebase (no Stripe/Polar/etc.) — the whole billing surface is presentational only. Untouched — this is a product/business decision, not an engineering task.
- **Notifications**: toggles still dead (`checked={true}`, `onChange={() => {}}`) — no backend concept of notification preferences exists to wire them to. Untouched.
> **Remaining prompt:** Billing needs a payment provider chosen (flag to whoever owns pricing). Notifications needs a preferences table + settings API.

### Settings → Developers (API keys, allowed origins)
**Fully working**, verified live. BYOK section removed entirely (no backend to back it, not confirmed as a launch feature — hidden rather than shipping a dead button; revisit if BYOK becomes a real requirement).

### Onboarding (org create, agent create, website create)
**Persists for real now.** This grew into a full feature build:
- New `agents` table (packages/db) holds per-tenant config: name, model, system prompt, tool-call budget, extended reasoning, enabled flag, tone preset, voice/clarification/escalation text, tool toggles (JSON).
- The system prompt and tool-call budget genuinely affect the live `/step` agent loop now (`packages/core`'s `EngineConfig` gained `systemPromptAddendum`/`maxToolCallsPerTurn`/`agentDisabled`; verified live — a custom prompt changed real model output, a disabled agent short-circuits before calling OpenRouter).
- FAQ and Files pages create real `docs`/`chunks` rows (added a `sourceType` column: `web`/`faq`/`file`) — chunked and embedded synchronously on save (no crawl queue needed), immediately searchable. Files only extract text content for `.txt`/`.md` today; other formats are stored as metadata only, honestly labeled as not yet indexed.
- Web Sources page wired to the real single-page crawl backend (new `/api/docs` proxy routes in apps/web).
- Org-creation flow now calls a new `PUT /api/account/organization` route that renames the auto-provisioned tenant (no separate "organization" concept exists — this was the right scope, not a new multi-org feature). Reflected live in the sidebar org switcher and Organization page (both previously hardcoded "Otto Labs").
- Website-create flow's final step now actually creates the live API key (not just test) and adds the domain to allowed origins — previously the success screen claimed this without doing it.
**Known gap:** custom tool toggles (Tools & Skills page) persist correctly but don't gate anything at runtime yet — the mock UI's tool set ("Update sentiment", "Finish: Escalate", etc.) doesn't match otto-core's actual implemented tools (click/fill/navigate/say/search_knowledge_base/done/fail/remember/forget). Reconciling the two tool vocabularies is a separate, follow-on investigation.

### `/demo` (Cordant fake SaaS)
**Solid**, verified — this is the one thing in `apps/web` that's genuinely finished. No action needed unless new demo scenarios are wanted.

### Widget embed (`otto-mount.tsx`)
**Works**, verified live end to end (key auth, origin check, tool-calling loop, memory). No gaps beyond what's already fixed.

### Missing pages / dead links
✅ Fixed — real placeholder pages built for `/docs`, `/pricing`, `/changelog`. Fixed the `/price` → `/pricing` typo.

### Missing favicon / error pages
✅ Fixed — added `apps/web/app/icon.svg`, `error.tsx`, and `not-found.tsx`.

### Deployment configuration
`OTTO_API_URL` defaults to `http://localhost:8787` both in `.env` and as a hardcoded fallback in `otto-api-proxy.ts`. Deploying `apps/web` anywhere other than co-located with `apps/api` requires this to be set explicitly, or every proxied feature breaks with the `api_unavailable` error.
> **Prompt:** Document the required production env vars for `apps/web` (`OTTO_API_URL` pointing at the real deployed API) in a `README`/`.env.production.example`, and confirm `apps/api`'s CORS (`dashboardOrigins()`, `OTTO_DASHBOARD_ORIGINS`) is set to the real production dashboard domain, not just localhost.

---

## Cross-cutting / infra (not owned by any one app)

### CI/CD baseline
✅ Added `.github/workflows/ci.yml` for push/PR. It installs with Bun 1.2.11, typechecks every app/package, runs backend tests, builds the publishable packages + both Next apps, and validates `docker-compose.yml`.
**Known caveat:** repo-wide `bun run lint` is not in CI yet because the existing Biome check still reports broad pre-existing formatter/unused-code diagnostics. Biome now honors `.gitignore`, so the local `cossistant/` reference checkout no longer blocks lint by itself.

### Reproducible local infra setup
✅ Added root `docker-compose.yml` with Postgres 16 + Redis 7, matching the local `DATABASE_URL`/`REDIS_URL` defaults. `docker compose up -d` now gives a fresh contributor the local backing services without Homebrew setup.

### High-risk test coverage
✅ Added focused tests for the highest-risk launch paths: API key/rate-limit/chunking coverage in `apps/api`, `otto-core`'s `runStep()` tool-resolution loop and runtime guards in `packages/core`, and web-crawl worker failure/no-embedding paths in `apps/workers`.
**Remaining gap:** `otto-db` query/mutation tests and apps/web component tests are still future coverage work.

### Secrets are placeholder values
`BETTER_AUTH_SECRET`, `OTTO_API_KEY_SECRET` in `apps/api/.env` are still literal `.env.example` text. Already listed under Auth/API keys above — repeating here because it blocks *everything* auth-related in production, not just one feature.
> **Prompt:** Generate real secrets (`openssl rand -hex 32` each) before any production deploy — this is a one-line-per-secret fix but a hard launch blocker.

---

## What's genuinely done, no further work needed

- Postgres migration (schema, async threading, verified live)
- Zod request validation across all of `apps/api`
- Auth signup/login core flow
- Tenant auto-provisioning (+ org rename via `PUT /api/account/organization`)
- API key creation/masking/revocation
- Allowed-origins management (exact-match, which is fine for launch)
- The agent tool-calling loop itself: act, search knowledge, remember/forget, pause/resume — all verified live
- Per-tenant agent configuration (system prompt, model, tool-call budget, enabled flag) — genuinely affects the live agent loop, verified live
- FAQ/file/web-source knowledge ingestion — real chunking + embedding, immediately searchable
- Real secrets generated (`BETTER_AUTH_SECRET`, `OTTO_API_KEY_SECRET`)
- Dashboard real data (sessions/metrics) + identity leak fix
- Onboarding wizard (org rename, agent config, knowledge sources, website API-key/origin provisioning)
- `/demo` Cordant surface
- Settings → Developers page
- Widget embed + WS/HTTP dual transport
- Favicon + error/not-found pages, `/docs`/`/pricing`/`/changelog` placeholder pages
- Rate limiting on `requireAgentKey`/`requireDashboard` (Redis-backed, fails open, verified live)
- Email verification (hard-gated) + password reset, wired through Resend (needs a real `RESEND_API_KEY` to actually send)
- Real `drizzle-kit` migrations tooling, existing DB baselined
- Per-tenant usage tracking (real tokens/requests/conversations, verified live end to end)
- Team invites (send/preview/accept/revoke, last-owner guard), verified live end to end
- Structured logging (pino) + unhandled-error handler in apps/api, verified live
- Worker health endpoint + `dump.rdb` git hygiene, verified live

## Priority order if launching soon

1. ~~**Secrets**~~ — done.
2. ~~**Dashboard real data + identity leak**~~ — done.
3. ~~**Rate limiting**~~ — done. Redis-backed fixed-window counter on `requireAgentKey` (60/60s per API key) and `requireDashboard` (300/60s per user), fails open if Redis is unreachable, verified live with a real flood test (429 + `Retry-After`, per-user scoping confirmed).
4. ~~**Email (verification + reset)**~~ — done. Resend wired via raw fetch (no SDK dep, matching `otto-core`'s style), `requireEmailVerification: true` so login is actually blocked pre-verification, gracefully logs to console instead of sending when `RESEND_API_KEY` isn't set yet. **Add a real `RESEND_API_KEY` before testing new signups locally, or they'll be stuck unable to log in.**
5. ~~**Migrations tooling**~~ — done. `drizzle-kit` + `drizzle-orm`'s `migrate()` replace the hand-rolled DDL; existing DB baselined.
6. Remaining larger gaps: billing provider integration, whole-site crawl/refresh, database backup/pool documentation, broader observability/Sentry, and deeper `otto-db`/apps-web test coverage.
