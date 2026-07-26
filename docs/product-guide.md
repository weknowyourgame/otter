# Otter — Product Guide

What Otter is, how onboarding works, how each feature actually works under the hood, and whether it's ready for real customers. For a line-by-line engineering audit of what's fake vs. real, see `docs/production-readiness.md` (full bar) and `docs/demo-readiness-checklist.md` (client-demo bar) — this doc is the narrative version of those two.

---

## What is Otter

Otter is an AI support agent you embed as a widget in your web app. A visitor chats with it; Otter reads the live page (via a small SDK that reports DOM state) and takes actions on the visitor's behalf — clicking, filling forms, navigating — instead of just describing what to do. It also answers questions from a knowledge base you train it on (docs pages, FAQs, files) and remembers facts about returning users across sessions.

Separately, there's a dashboard where you configure the agent, manage your knowledge base, invite teammates, and (eventually) see usage and billing.

**Repo shape:**
- `apps/api` — the agent backend (Hono + Bun). Auth, the agent loop, knowledge base, team/tenant management. This is the source of truth; everything else proxies to it.
- `apps/web` — the dashboard (Next.js) + the `/demo` showcase app (a fake SaaS called "Cordant" used to demo the widget acting inside a real-feeling product).
- `apps/workers` — background job processor (currently: crawling a URL via Firecrawl, chunking, embedding, storing it as searchable knowledge).
- `apps/landing` — the public marketing site (separate app, actively maintained elsewhere — not covered here).
- `packages/core` (`otter-core`) — the agent engine itself: the tool-calling loop, prompt construction, knowledge retrieval, memory.
- `packages/db` (`otter-db`) — Postgres schema + queries, shared by `apps/api` and `apps/workers`.
- `packages/sdk` — the widget SDK a customer installs on their own site.

---

## Onboarding — how it actually works

### 1. Sign up
A new user signs up with email + password (Better Auth). Two things happen automatically the moment the account is created:
- **A tenant (workspace) is auto-provisioned** — named `"{their name}'s workspace"` — with the new user as its `owner`. There's no separate "create an organization" step required; it already exists by the time they see the dashboard.
- **A verification email is sent** (via Resend, if `RESEND_API_KEY` is configured — otherwise the link is logged to the server console instead, which is fine for local dev but means real strangers can't complete signup until a real key is added). **Login is blocked until the email is verified** — this isn't cosmetic, it's enforced (`requireEmailVerification: true`).

### 2. Confirm/rename the workspace
The onboarding wizard's "Create an organization" step is really just **renaming** the auto-created tenant (`PUT /api/account/organization`) — there's no multi-org concept, so this step exists purely for the user to name their workspace something better than the auto-generated default.

### 3. Create a website + get a key
The "Create website" flow:
- Generates a real **public test API key** scoped to that key's own allowed origins.
- On finishing the install step, it also generates a real **public live key** and adds the domain you entered to your allowed origins.
- Shows you the real key inline (via `npm install otter-sdk`, not a placeholder) so you can copy-paste it straight into your app.

### 4. Install the widget
In your own app:
```
npm install otter-sdk
```
Wrap your app in `OtterProvider`, mount `<OtterWidget />` once, and pass it the public key you just got. The widget authenticates every request with that key and only works from origins you've explicitly allowed (exact-match on the URL, no wildcards yet).

### 5. Train the agent (optional but recommended)
From Agent → Knowledge, add:
- **Web Sources** — paste a URL, Otter crawls that one page (via Firecrawl), chunks it, embeds it, and it's searchable within moments.
- **FAQs** — type a question + canonical answer; it's stored and embedded immediately, same searchable knowledge base.
- **Files** — upload `.txt`/`.md` files for real indexing (other formats are stored but not yet content-searchable, clearly labeled as such).

### 6. Configure the agent's behavior (optional)
From Agent → General/Behaviour/Tools & Skills, you can set a custom system-prompt addendum, pick a model, cap tool calls per turn, toggle extended reasoning, and turn the agent on/off entirely. **This isn't cosmetic — it genuinely changes what the live agent does** on the very next real conversation.

### 7. Invite teammates
Settings → Team → "Invite teammate" sends a real email with a signed invite link (`/invite/<token>`, 7-day expiry). The invitee either signs in (if they already have an account) or creates one right there; accepting attaches them to your tenant with the role you picked. Owners can remove members (a workspace can never be left with zero owners — that's blocked).

---

## Features — what exists and how it works

### Auth
Email/password via Better Auth. Email verification and password reset are both real, sent through Resend (console-logged fallback if no key is set). Sessions are cookie-based; dashboard routes require a valid session.

### Dashboard — Inbox
Shows real data from `GET /sessions`: live visitor count (active agent sessions right now), total conversations, % handled by AI without human escalation, and a real conversation list filterable by inbox/resolved. Nothing here is a fake fixed number — a brand-new tenant genuinely shows all zeros.

### Agent configuration
One agent config per tenant (no multi-agent/multi-website concept yet). Configurable: name, a custom system-prompt addendum (appended to Otter's base browser-automation instructions, never replacing them — so a bad prompt can't break the tool-calling contract), max tool calls per turn, extended-reasoning toggle, and an enabled/disabled switch. Agent turns always use `openai/gpt-5.3-codex`.

**Known gap:** the Tools & Skills page's toggles (things like "Update sentiment," "Finish: Escalate") persist correctly but don't gate anything yet — the mock tool list there doesn't match Otter's actual implemented tools (click/fill/navigate/scroll/say/search_knowledge_base/done/fail/remember/forget). Reconciling the two is separate future work.

### Knowledge base
Single-page ingestion only (no whole-site crawl yet) via Firecrawl. Every source — web page, FAQ, or file — becomes a `doc` with `chunks`, embedded via OpenRouter, retrieved by cosine similarity when the agent calls `search_knowledge_base`. If there's no relevant match above a relevance threshold, the agent is instructed to say so honestly rather than guess.

### Widget embed
Public keys are used for real customer-facing widgets (origin-restricted); secret keys are meant for server-side use. The widget talks to `/step` (HTTP) or `/ws` (WebSocket) — both go through the same agent loop, rate-limited per API key (60 requests/60s by default).

### Team & tenants
One tenant per user (single-workspace model — no switching between multiple workspaces yet). Real invite flow (see Onboarding above). Removing the last owner is blocked so a workspace can never end up ownerless.

### Usage tracking
Every real LLM call records its actual token usage into a `usage_events` table. Plan & Usage shows real 30-day rolling numbers: requests, tokens, conversations, team members. The plan-tier *limits* shown (200 messages, 20 conversations, 3 seats, 1M tokens) are stated design targets, not currently enforced anywhere — there's no billing/plan-enforcement layer yet, just the rate limiter as a blunt backstop.

### Rate limiting
Redis-backed, per-API-key (60/60s) and per-dashboard-user (300/60s). Fails open if Redis is unreachable — availability of the agent loop matters more than perfect enforcement.

### Settings
- **General** — real logged-in user's name/email.
- **Developers** — real API key + allowed-origin management, fully functional.
- **Team** — real, see above.
- **Plan & Usage** — real usage numbers (see above), fake-but-honest plan limits, no payment enforcement.
- **Notifications** — still cosmetic (toggles don't persist anywhere).
- **Billing** — presentational only; no payment provider integrated. This is the single biggest remaining gap before charging anyone.

### `/demo` (Cordant)
A fully interactive fake SaaS product (a support-ticket tool) used to show Otter acting inside a real-feeling app — clicking buttons, filling forms, navigating between real pages, with local-storage-backed state so it behaves like a live product. This is the most polished, demo-ready part of the whole repo.

---

## Is this production-ready?

**Short answer: close, with one real blocker and a handful of smaller gaps — everything else has been built and verified live, not just typechecked.**

**What's solid enough to trust:**
- Auth, tenant provisioning, API keys, allowed origins, the agent loop itself, rate limiting, structured logging, real database migrations, per-tenant usage tracking, team invites, the entire onboarding path, and the knowledge base — all built, tested, and verified against a real running system (real signups, real Postgres rows, real OpenRouter calls).

**What would stop you from launching today:**
1. **No payment provider.** Billing is presentational. This is a product decision (which provider, what plans) before it's an engineering task — nothing else in the backend is blocked by it, but you can't charge anyone until it exists.
2. **Email needs a real `RESEND_API_KEY`.** Right now verification/reset emails just log to the console. Trivial to fix, but it's a hard requirement before real strangers can sign up.
3. **`apps/landing`'s production build is currently broken**, independent of everything above — that's a different app under separate active development, flagged but not something this guide's scope covers fixing.

**Smaller, non-blocking gaps** (safe to launch without, worth doing soon after): whole-site crawling (single-page only today), per-tenant storage caps, notification preferences, Sentry/error-tracking (deliberately deferred, needs a DSN), Postgres backup strategy, and reconciling the Tools & Skills mock list with the agent's real tool set.

For the complete line-item breakdown behind every claim above — what was tested, how, and the exact prompt to hand an agent for each remaining gap — see `docs/production-readiness.md`.
