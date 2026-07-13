# Otto

**Support that completes the task instead of explaining it.**

Otto is an embeddable AI support agent. A customer types "how do I enable
2FA?" into the widget, clicks **Allow** once, and Otto takes the cursor:
it navigates the app, clicks and types with a visible animated pointer,
streams every step into the chat ("Opening security settings…" ✓), and
finishes with the task actually done on screen. A **Stop** button floats
on the page the whole time.

```
packages/
  core/   otto-core — the brain. runStep() takes {message?, snapshot,
          lastAction?} and returns exactly one next action via LLM
          tool-calling (OpenRouter), with a keyless local fallback
          planner. In-memory sessions power the dashboard feed.
  sdk/    otto-sdk — the eyes and hands. Vanilla TS in one shadow root:
          DOM serializer (ref-stamped elements), executor (animated
          cursor + target ring, char-by-char typing, DOM-settle waits),
          chat UI with step trails, consent + destructive-action gates.
          Ships as npm ESM and a script-tag IIFE build.
apps/
  web/    Next.js app: marketing page (/), dashboard with install
          snippet + live sessions (/dashboard), the Nimbus demo SaaS
          (/demo), and the agent API (/api/agent/step).
  landing/  unrelated production landing page (Stealth Markets).
```

## Quick start

```bash
npm install
npm run build     # builds otto-core + otto-sdk
npm run dev       # apps/web on http://localhost:3000
```

Open http://localhost:3000/demo and ask Otto to *"enable two-factor
authentication for me"* — then watch the cursor. Sessions appear live at
http://localhost:3000/dashboard.

### Environment (`apps/web/.env.local`)

```bash
OPENROUTER_API_KEY=   # enables the real agent (get one at openrouter.ai/keys)
AGENT_MODEL=anthropic/claude-sonnet-4.5   # optional override
```

Without a key the loop still runs on a deterministic keyword planner —
good enough to demo the takeover UX, not the intelligence.

## The loop

```
user message ──► SDK serializes the page (interactive elements, refs,
                 headings, state) ──► POST /api/agent/step
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
  page whenever Otto is acting; Stop aborts mid-flight.
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
<script src="https://your-cdn/otto-sdk.global.js"
        data-endpoint="https://your-app.com/api/agent" defer></script>
```

or programmatically:

```ts
import { init } from "otto-sdk";

init({
  endpoint: "/api/agent",
  name: "Otto",
  accent: "#5B6CF9",
  theme: "dark",            // "light" | "auto"
  user: { email: currentUser.email },   // session attribution
});
```

## Status / not yet built

- Sessions are in-memory (single process). Real deployments need a store.
- The `/api/agent/step` CORS is `*` and the dashboard key is a mock —
  per-tenant API keys and auth come with the connector layer.
- Helpdesk connectors (Zendesk/Jira/Intercom inbound tickets → guided
  replies, escalation back) are designed but intentionally removed from
  this iteration; they return as thin adapters on otto-core.
