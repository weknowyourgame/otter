# Otter ← Cossistant integration plan

What we're copying from `cossistant/` into Otter, and what we're skipping. Cossistant's code is AGPL-3.0 (free for non-commercial use, paid license for commercial) — check which one Otter is before copying actual source, not just the idea.

## Cloning

### Live connection (chat/step streaming)
| Source | Why we're copying it |
|---|---|
| `apps/api/src/ws/socket.ts` | Turns Otter's polling into a live socket connection. |
| `apps/api/src/ws/router.ts` | Rules for who gets which live update (page vs dashboard). |
| `apps/api/src/ws/connection-registry.ts` | Keeps track of who's currently connected. |
| `apps/api/src/ws/realtime-pubsub.ts` | Lets live updates work even if Otter runs on more than one server. |
| `packages/redis/src/connection.ts` | Ready-made Redis connection code, works as-is. |

### Remembering sessions (fixes "everything resets")
| Source | Why we're copying it |
|---|---|
| `apps/api/src/db/schema`, `queries/`, `mutations/` | Saves sessions/steps to a real database instead of memory that wipes on restart. |
| `apps/api/src/ai-pipeline/shared/safety/kill-switch.ts` | An instant off-switch for the whole agent, no redeploy needed — important since Otter clicks around real UIs. |

### Logins & access
| Source | Why we're copying it |
|---|---|
| `apps/api/src/lib/auth.tsx` | Real login system, replaces Otter's fake dashboard key. |
| `apps/api/src/utils/api-keys/` | Gives each customer their own API key instead of one shared open key. |

### Shipping the widget itself
| Source | Why we're copying it |
|---|---|
| `packages/browser/src/embed/loader.ts` | The small script that loads when someone drops Otter's `<script>` tag on their site. |
| `packages/browser/src/embed/widget-runtime.ts`, `asset-urls.ts` | Loads the real widget after the small script, and points it at the right file versions. |
| `scripts/checks/browser-embed-size.ts` | Fails the build if the widget file gets too big. |
| `scripts/prepare-package.ts` | Packages `otter-core`/`otter-sdk` for publishing to npm. |

### Answering questions (not just doing tasks)
| Source | Why we're copying it |
|---|---|
| `apps/api/src/db/schema` (docs table) | Place to store a customer's help docs so Otter can answer from them. |
| `apps/workers/src/queues/web-crawl/` + `packages/jobs/src/triggers/web-crawl.ts` | Job that pulls in a customer's website content in the background. **Note:** it doesn't scrape pages itself — it calls Firecrawl (a paid third-party scraping API). We'd copy the queue/job wiring but still need a Firecrawl key, or swap in our own scraper. |
| `apps/api/src/lib/embedding-client.ts` | Turns doc text into searchable vectors. |
| `apps/api/src/utils/vector-search.ts` | Finds the relevant doc chunk for a question. |
| `apps/api/src/ai-pipeline/shared/knowledge-gap/` | Makes Otter say "I don't know" instead of making something up. |
| `apps/api/src/ai-pipeline/primary-pipeline` (generation step) | Template for turning retrieved doc chunks into an actual answer. |
| `apps/api/src/support-capabilities/knowledge.ts` | Limits what Otter is allowed to answer about, per customer. |

### Background jobs / future connectors (Zendesk, Jira, etc.)
| Source | Why we're copying it |
|---|---|
| `packages/jobs` (dedupe/debounce helpers) | Generic "don't run the same job twice" helpers, nothing Cossistant-specific about them. |
| `apps/workers` folder layout | Copy the pattern (one worker file per job type) for whatever connectors Otter adds later. |

### Memory across sessions
| Source | Why we're copying it |
|---|---|
| `packages/memory` | Lets Otter remember facts about a user between visits (e.g. "already turned on 2FA last week") using the same tool-calling style Otter's engine already uses. |

### Shared setup / dev tooling
| Source | Why we're copying it |
|---|---|
| `packages/types/src/realtime-events.ts` (pattern) | Template for defining Otter's own list of event types shared between server and widget. |
| `packages/typescript-config` | Just shared tsconfig files, safe to copy directly. |
| Biome, Husky, commitlint, lint-staged, Changesets configs | Generic dev tooling setup, nothing Cossistant-specific. |
| `packages/release` | Automates changelogs/releases, works for any repo. |

### Nice-to-have, not urgent
| Source | Why we're copying it |
|---|---|
| `apps/geoip` + `services/geoip.ts` | Only needed if we want to show visitor country/city on the dashboard. |
| `packages/location` | Only needed if we translate Otter's answers into other languages later. |
| `infra/aws/s3-public-setup` | Only needed if Otter should support file uploads (e.g. screenshots). |

## Not cloning

| Source | Why we're skipping it |
|---|---|
| `apps/api/src/mcp/` | Cool feature (lets other AI tools call Otter) but not needed to get act + answer working — later. |
| `apps/api/src/polar/`, `lib/plans`, `lib/team-seats.ts` | This is Cossistant's billing system. Otter doesn't have pricing plans yet. |
| `tinybird/` | Cossistant's analytics dashboard backend — built for their metrics, not something Otter needs. |
| `apps/api/src/lifecycle-email/` | Automated marketing emails ("come back and try us"). Not relevant to an agent that does tasks. |
| `apps/api/src/mail/`, `resend/`, `ses/`, `infra/aws/ses-email-setup` | Otter doesn't send/receive email yet, so there's nothing for this to plug into. |
| `apps/facehash-landing`, `packages/facehash` | A completely different product (an avatar generator) bundled in the same repo. Not related to Otter at all. |
| `packages/tiny-markdown` | A markdown renderer for Cossistant's chat. Otter doesn't need this. |
| `packages/transactional` | Was empty when we checked, and tied to the email system we're skipping anyway. |
| `examples/nextjs-tailwind`, `examples/react-vite` | Sample apps showing how to install `@cossistant/react`. Otter has its own SDK, doesn't apply. |
| `apps/api/src/ai-pipeline` (everything besides generation/knowledge-gap) | The rest is Cossistant's respond-or-stay-silent decision logic (should the bot even reply to this message) — not relevant to Otter, which always acts on an explicit user request. |

## Ground rules for the build (read before every phase)

- **This repo has other agents working in it.** A separate agent owns `apps/web/app/(marketing)/**` (landing page: `page.tsx`, its own `layout.tsx`, `globals.css`, `otter-runtime.tsx`, `public/mirage*`). Never edit, `git add`, or commit those paths. See `[[otter-monorepo-parallel-agents]]` / `[[otter-shared-globals-css-risk]]` in project memory.
- **Never `git add -A` or `git add .` inside `apps/web`.** Stage files explicitly by path so you can't sweep up another agent's uncommitted work.
- **Never run a dev server with the default `.next` dir.** Set `NEXT_DIST_DIR=.next-<yourname>` (the user's own `bun run dev` already uses `.next-main`). Pick a distinct dir per phase/session so builds don't collide.
- **Don't add custom `@theme` tokens to any `globals.css` outside `app/(app)/globals.css`.** It broke `/demo` twice before the layout split — Cordant's pages intentionally use only Tailwind's stock palette.
- **If you touch `tsconfig.json`'s `include` array**, only remove `.next-*/types` globs for dist dirs you created yourself — check `lsof +D <dir>` before deleting one you didn't make.
- **Commit as you go, not in one giant diff.** One commit per phase (or sub-step if a phase is large), with a message that says what was copied/adapted from Cossistant and why. Use `bun` for all scripts per `[[user-prefers-bun]]` (esbuild scripts stay on node).
- **Before starting a phase**, run `git status` and `git log --oneline -5` to confirm you're not stepping on uncommitted work from another agent.
- Cossistant is AGPL-3.0 non-commercial. Note in each commit message when a phase copies actual source (not just the pattern) so licensing can be checked later.

## Build plan — prompts per phase

Run these in order. Each block is a self-contained prompt — hand it to the agent as-is when starting that phase.

### Phase 1 — Shared dev tooling
> Copy `cossistant/packages/typescript-config` into `packages/typescript-config` in this repo, adapting package name from `@cossistant/typescript-config` to match this repo's scope. Bring over the Biome/Ultracite config, Husky hooks, commitlint config, lint-staged config, and Changesets setup from Cossistant's root, adapting them to this repo's workspace layout (`packages/*`, `apps/*`). Don't touch anything under `apps/web/app/(marketing)/`. Verify `bun run lint` and `bun run check-types` still pass after wiring configs in. Commit as `chore: adopt cossistant dev tooling (typescript-config, biome, husky, changesets)`.

### Phase 2 — Redis connection
> Copy `cossistant/packages/redis/src/connection.ts` into a new `packages/redis` package in this repo, unchanged (it's provider-agnostic). Add it as a workspace dependency. Don't wire it into anything yet — this phase is just landing the package. Commit as `feat(redis): add ioredis connection package from cossistant`.

### Phase 3 — Session & step persistence (DB)
> Design a Drizzle schema for Otter sessions and steps, using `cossistant/apps/api/src/db/schema` as the structural reference (not a literal copy — Otter's entities are `session`, `step`, `action` not `conversation`/`message`). Add `queries/` and `mutations/` folders mirroring Cossistant's separation. Wire `otter-core`'s `engine.ts` to persist each `runStep()` result instead of keeping it in-memory. Migrate the dashboard's live-sessions feed to read from the DB. Commit in two steps: `feat(core): add session/step persistence schema` then `feat(core): wire engine.runStep to persist via db`.

### Phase 4 — WS realtime layer
> Using `cossistant/apps/api/src/ws/socket.ts`, `router.ts`, `connection-registry.ts`, and `realtime-pubsub.ts` as the reference, add a WebSocket endpoint to `apps/web`'s agent API (or a new `apps/api` if Otter's backend gets split out — check with the user first if that split doesn't exist yet). Depends on Phase 2 (redis) for pub/sub. Replace the SDK's per-step HTTP POST to `/api/agent/step` with a live socket; keep the HTTP endpoint as a fallback until the socket path is verified working end to end in `/demo`. Commit as `feat(ws): replace step polling with realtime socket`.

### Phase 5 — Auth & per-tenant API keys
> Using `cossistant/apps/api/src/lib/auth.tsx` (better-auth) and `apps/api/src/utils/api-keys/` as reference, add real auth to Otter's dashboard and issue per-tenant API keys for `/api/agent`. Replace the current mock dashboard key. Lock down the wide-open CORS (`*`) on `/api/agent/step` to registered origins per key. This directly resolves the two items in Otter's README "Status / not yet built" section — update that section once done. Commit as `feat(auth): add per-tenant auth and api keys, replace mock key`.

### Phase 6 — Widget distribution (otter-sdk packaging)
> Using `cossistant/packages/browser/src/embed/loader.ts`, `widget-runtime.ts`, and `asset-urls.ts` as the template, split `otter-sdk` into a tiny bootstrap loader (small script-tag entry, checks for existing instance) and a lazy-loaded runtime bundle. Copy `cossistant/scripts/checks/browser-embed-size.ts` and adapt its size budget for `otter-sdk`; wire it into CI/build. Copy and adapt `cossistant/scripts/prepare-package.ts` for publishing `otter-core`/`otter-sdk` to npm. Commit as `feat(sdk): split loader/runtime, add bundle size check`.

### Phase 7 — Knowledge base ingestion (answer path, part 1)
> Add a `docs`/`chunk` schema to Otter's DB (reference: `cossistant/apps/api/src/db/schema`, chunk table). Add a `web-crawl` job using `cossistant/apps/workers/src/queues/web-crawl/worker.ts` and `slot-lease.ts` as the structural reference — note it calls Firecrawl, a paid third-party API, not an in-house scraper; get a Firecrawl key or confirm the swap-in scraper with the user before wiring this live. Add the trigger following `cossistant/packages/jobs/src/triggers/web-crawl.ts`. Depends on Phase 2 (redis) and a workers process (new `apps/workers`, referencing Cossistant's folder layout — one file per job). Commit as `feat(knowledge): add doc ingestion schema and web-crawl job`.

### Phase 8 — Retrieval & grounded answers (answer path, part 2)
> Copy and adapt `cossistant/apps/api/src/lib/embedding-client.ts` and `apps/api/src/utils/vector-search.ts`. Add an `answer` branch to `otter-core`'s `runStep()` intent routing: classify "do X" vs "what is X" before choosing the DOM-action tool loop or this new answer path. Use `cossistant/apps/api/src/ai-pipeline/shared/knowledge-gap/` as reference for detecting "can't answer from docs" instead of hallucinating. Use the `primary-pipeline` generation step as a template for the actual grounded-answer call. Depends on Phase 7. Commit as `feat(core): add knowledge-grounded answer path to engine`.

### Phase 9 — Cross-session memory
> Copy `cossistant/packages/memory` into a new `packages/memory`, adapting it to Otter's tool-calling loop in `otter-core/engine.ts` (same shape Cossistant uses — an LLM-callable remember/forget tool). Wire it in as an additional tool alongside the existing DOM-action tools. Commit as `feat(memory): add cross-session memory package and tool`.

### Phase 10 — Safety controls
> Using `cossistant/apps/api/src/ai-pipeline/shared/safety/kill-switch.ts` as reference, add a per-session pause mechanism (Redis-backed) Otter's dashboard can trigger to stop an in-progress agent session immediately — this is in addition to, not a replacement for, the SDK's client-side Stop button, which must keep working even if the server is unreachable. Commit as `feat(safety): add server-side per-session pause switch`.

### Phase 11 — Connector scaffold (lower priority)
> Using `cossistant/apps/workers` folder layout and `cossistant/packages/jobs`'s dedupe/debounce utils (`unique-job.ts`, `debounced-job.ts`, `single-active-job.ts`) as reference, scaffold (don't fully build) worker stubs for future Zendesk/Jira/Intercom connectors described in Otter's README. This phase is scaffolding only — stub the queue registration, leave the actual ticket-handling logic as a TODO. Commit as `feat(workers): scaffold connector queue structure`.

### Phase 12 — Nice-to-have (only if requested)
> Geoip (`apps/geoip` + `services/geoip.ts`), `packages/location`, and `infra/aws/s3-public-setup` are optional. Do not start this phase unless explicitly asked — confirm which of the three is wanted first, they're independent of each other and of every phase above except general session/dashboard plumbing (Phase 3-4).
