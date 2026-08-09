# Otter

**Support that completes the task instead of explaining it.**

Otter is an embeddable AI support agent. A customer types "how do I enable
2FA?" into the widget, clicks **Allow** once, and Otter takes the cursor:
it navigates the app, clicks and types with a visible animated pointer,
streams every step into the chat ("Opening security settings…" ✓), and
finishes with the task actually done on screen. A **Stop** button floats
on the page the whole time.

```
packages/
  core/   otter-core — the brain. runStep() takes {message?, snapshot,
          lastAction?} and returns exactly one next action via LLM
          tool-calling (OpenRouter), with a keyless local fallback
          planner. Tenant-scoped Postgres sessions power the dashboard feed.
  sdk/    otter-sdk — the eyes and hands. Vanilla TS in one shadow root:
          DOM serializer (ref-stamped elements), executor (animated
          cursor + target ring, char-by-char typing, DOM-settle waits),
          chat UI with step trails, consent + destructive-action gates.
          Ships as npm ESM and a script-tag IIFE build.
apps/
  api/    Hono + Bun backend: Better Auth, tenant API keys, origin-scoped
          agent HTTP/WebSocket endpoints, sessions, and knowledge APIs.
  web/    Next.js dashboard, auth UI, developer settings, the Cordant demo
          SaaS (/demo), and same-origin proxies to apps/api.
  demo/   Standalone Cordant demo SaaS. It mounts the SDK like a customer
          app, calling the configured Otter API directly with a public key.
  workers/
          Local BullMQ worker plus Cloudflare Worker/Queue entrypoint for
          website crawl ingestion.
  landing/
          Marketing and docs site.
```

## Quick start

Needs a running Postgres instance — `createdb otter` (or point `DATABASE_URL`
at any Postgres) before starting the API. otter-db creates its own tables on
first connect; there's no separate migration step.

```bash
bun install
bun run build
bun run dev:all   # landing :3000, dashboard :3001, API :8787
```

Or bring everything but the landing page up in containers, on the same ports, with the
repo bind-mounted so hot reload still works:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Create an account at http://localhost:3001/login, then issue a public key
under **Settings -> Developers**. Register the exact origin that embeds Otter.

### API environment (`apps/api/.env`)

```bash
DATABASE_URL=postgres://localhost:5432/otter
BETTER_AUTH_URL=http://localhost:8787
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
OTTER_API_KEY_SECRET=replace-with-a-different-32-character-secret
OTTER_DASHBOARD_ORIGINS=http://localhost:3001
OPENROUTER_API_KEY=
```

Copy `apps/api/.env.example` and `apps/web/.env.example` for the complete
local setup. Without an OpenRouter key the loop uses the deterministic local
planner; agent requests still require an Otter tenant key.

Agent turns use one operator-pinned model. `LLM_PROVIDER` picks the backend —
`openrouter` (default, `openai/gpt-5.3-codex`) or `groq` (`openai/gpt-oss-20b`,
needs `GROQ_API_KEY`) — and `AGENT_MODEL` overrides the model. Embeddings always
go to OpenRouter, so `OPENROUTER_API_KEY` is still needed for knowledge search
even on Groq.

### Worker environment (`apps/workers/.env`)

```bash
DATABASE_URL=postgres://localhost:5432/otter
REDIS_URL=redis://127.0.0.1:6379
OPENROUTER_API_KEY=
FIRECRAWL_API_KEY=
FIRECRAWL_CRAWL_LIMIT=50
FIRECRAWL_MAX_CONCURRENCY=2
FIRECRAWL_ALLOW_SUBDOMAINS=1
FIRECRAWL_ALLOW_EXTERNAL_LINKS=0
```

Website imports use Firecrawl's crawl API, follow same-domain pages and
subdomains by default, and store each discovered page as source-labeled
knowledge chunks. External links stay off by default so crawls do not wander
outside the customer site.

### Cloudflare worker mode

Local BullMQ remains the default. To exercise the Cloudflare path locally:

```bash
cp apps/workers/.dev.vars.example apps/workers/.dev.vars
bun run workers:cloudflare
```

Set these API values in `apps/api/.env`:

```bash
WEB_CRAWL_BACKEND=cloudflare
CLOUDFLARE_WEB_CRAWL_ENQUEUE_URL=http://localhost:8790/enqueue
OTTER_WORKER_SECRET=replace-with-a-local-secret
FIRECRAWL_API_KEY=fc_...
```

Set the same `OTTER_WORKER_SECRET` in `apps/workers/.dev.vars`.

For production, `CLOUDFLARE_WEB_CRAWL_ENQUEUE_URL` should point to the deployed
Cloudflare Worker `/enqueue` URL. The Cloudflare queue consumer calls
`apps/api`'s protected `/internal/web-crawl/process` endpoint.

## The loop

```
user message ──► SDK serializes the page (interactive elements, refs,
                 headings, state) ──► POST ${endpoint}/step
                 ◄── one action: click / fill / navigate / scroll /
                     say / done / fail  (+ a live status line)
SDK executes it: scrolls target into view, walks the cursor over,
rings the element, acts, waits for the DOM to settle ──► re-observe
──► next step … until done / say / fail / Stop / step cap.
```

Tasks survive full page reloads: the loop persists itself to
sessionStorage before a hard navigation and resumes on the other side.

## Trust model (client-side, not configurable off)

- **Nothing moves without consent** — one Allow card per conversation.
- **Always stoppable** — a working pill with a Stop button floats on the
  page whenever Otter is acting; Stop aborts mid-flight.
- **Destructive actions re-confirm individually** — delete / remove /
  cancel plan / payment / password fills each get their own explicit
  confirmation card, regardless of what the backend planned.
- **Never invents secrets** — values it doesn't know (2FA codes,
  passwords) are asked for via chat, not guessed.
- **Page text is data, not instructions** — the system prompt treats
  on-page content as untrusted input.
- Hard step cap per task on both client and server.

## Embedding

```html
<script src="https://your-cdn/otter-sdk.global.js"
        data-endpoint="https://api.your-app.com"
        data-public-key="pk_live_..." defer></script>
```

or programmatically:

```ts
import { init } from "otter-sdk";

init({
  endpoint: "https://api.your-app.com",
  publicKey: "pk_live_...",
  name: "Otter",
  accent: "#5B6CF9",
  theme: "dark",            // "light" | "auto"
  user: { email: currentUser.email },   // session attribution
});
```

## Status

- Sessions, knowledge, and memory persist in Postgres and are tenant-scoped.
- Dashboard access uses Better Auth. Developer settings issue revocable,
  hashed tenant API keys and register exact browser origins.
- Agent HTTP and WebSocket requests require a valid key. CORS echoes only a
  registered origin for that key's tenant; there is no wildcard fallback.

## Not yet built

- Helpdesk connectors (Zendesk/Jira/Intercom inbound tickets → guided
  replies, escalation back) are designed but intentionally removed from
  this iteration; they return as thin adapters on otter-core.
