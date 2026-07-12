# ai-widget-monorepo

An embeddable, approval-gated AI DOM assistant: it observes the page,
proposes an action ("I found the docs link, want me to open it?"), waits
for you to click **Allow**, then scrolls to / highlights / clicks the
matching element.

```
packages/
  sdk/            the client widget (TypeScript -> esbuild -> script-tag + npm builds)
  ai-proxy-core/  shared "call OpenRouter, validate the response" logic —
                  the one implementation of the backend contract in this repo
  server/         reference AI backend: plain Node http server around
                  ai-proxy-core, zero runtime dependencies of its own
apps/
  landing/        Stealth Markets — a real production landing page using the
                  widget for real (programmatic init, Vercel-deployable
                  backend using ai-proxy-core)
examples/
  nextjs-loginwithchatgpt/   minimal Next.js app showing the npm/import
                             integration path (the pattern a real React app
                             should use, as opposed to a raw <script> tag)
```

## Quick start

```bash
npm install
npm run build      # builds ai-proxy-core + packages/sdk
npm run server      # terminal 1: standalone AI proxy on http://localhost:8787
npm run example      # terminal 2: Next.js example on http://localhost:3000
npm run landing        # or: the real landing page on http://localhost:5173
                        # (has its own /api/ai-proxy via vite dev middleware —
                        # doesn't need packages/server running)
```

Each of `packages/server/.env` and `apps/landing/.env` needs its own
`OPENROUTER_API_KEY` for real AI matching (get one free at openrouter.ai/keys)
— they're separate deployables, so they don't share config. Without a key,
the widget still works, falling back to a local keyword matcher, no LLM
required.

## What it can do

- `scrollTo` / `highlight` / `scrollAndHighlight` — always allowed.
- `click` — real clicks, e.g. "take me to the docs" actually navigates.
  **Nothing executes without an explicit "Allow" click in the chat UI, and
  every click is independently re-validated against the live DOM right
  before it fires** — an element that's risky (payment, delete, password,
  checkout, submit, account changes, or any actual form-submit control) or
  isn't a real button/link is refused and highlighted instead, regardless of
  what the AI backend or local matcher proposed. This check lives in the SDK
  client, not the backend, and isn't configurable off.

See `packages/sdk/README.md` for the full config reference, backend
contract, and safety model.

## Jira Service Management Free Demo Setup

Support-tool handoff demo: a customer asks "Where do I enable 2FA?" in a
Jira Service Management (JSM) request → Jira Automation calls this repo's
backend → the backend replies with a guided link **and** parks a one-time
pending delivery for the reporter email → the SDK on the already-open SaaS
page polls for it and asks permission to show the control. The public Jira
comment and its guided link remain the fallback for anyone who has left the
page.

Jira is only the support surface. The backend is the brain. The SDK controls
the browser. Jira never touches the SaaS app directly. Uses JSM **Free** +
built-in Automation — no paid features, no Marketplace app, no OAuth.

### How it works

```
Jira request created
  └─ Automation rule: Send web request (Wait for response ON)
       └─ POST /api/connectors/jira/automation   (x-guidance-demo-secret header)
            ├─ intent registry match (deterministic, first)
            ├─ optional LLM fallback (can only pick from the registry)
            └─ mints a 15-min handoff token, returns JSON
       └─ Automation: Add comment = {{webhookResponse.body.replyMarkdown}}
Customer clicks the link (…/settings/security?guide_handoff=TOKEN)
  └─ SDK reads guide_handoff → GET /api/guidance/handoffs/:token
       └─ navigates to plan.route, finds plan.targetSelector,
          scrolls + highlights. Clicks need explicit approval;
          high-risk plans are highlight-only no matter what.

Meanwhile, for an open tab that initialized the SDK with `userEmail`:
  └─ SDK polls GET /api/guidance/pending?email=… every 5 seconds while visible
       └─ receives token + intent + reply preview once, opens an Allow/Dismiss card
            └─ Allow fetches the same handoff plan and uses the same executor
```

### Backend env (`packages/server/.env`)

```bash
JIRA_AUTOMATION_SECRET=  # long random string, same value goes in the Jira rule header
DEMO_APP_URL=http://localhost:3000   # where handoff links point (the Next.js example)
OPENROUTER_API_KEY=      # optional — enables the LLM fallback for unlisted phrasings
```

Jira Cloud cannot reach `localhost` — for a real Jira round-trip, expose the
backend with a free tunnel (`ngrok http 8787` or `cloudflared tunnel --url
http://localhost:8787`) and use that URL in the rule. Never commit tunnel
URLs or secrets.

### Jira setup (exact steps)

1. Create a **Jira Service Management Free** project (Service project).
2. Open **Project settings → Automation**.
3. **Create rule**.
4. Trigger: **Work item created** (a.k.a. Request/Issue created).
5. Action: **Send web request**.
6. Method: **POST**.
7. URL: `https://YOUR_BACKEND/api/connectors/jira/automation`
8. Headers:
   - `Content-Type: application/json`
   - `x-guidance-demo-secret: YOUR_SECRET`
9. Web request body — **Custom data**:

   ```json
   {
     "tenantId": "demo",
     "source": "jira_service_management",
     "issueKey": "{{issue.key}}",
     "issueId": "{{issue.id}}",
     "summary": "{{issue.summary.jsonEncode}}",
     "description": "{{issue.description.jsonEncode}}",
     "reporterEmail": "{{reporter.emailAddress}}",
     "reporterName": "{{reporter.displayName}}",
     "customerRequestUrl": "{{issue.url}}"
   }
   ```

10. Enable **"Wait for response"** — without it `{{webhookResponse.body}}`
    is empty and the comment will be blank.
11. Add next action: **Comment on issue** (a.k.a. Add comment).
12. Comment visibility: **share with customer** (public), not internal.
13. Comment body: `{{webhookResponse.body.replyMarkdown}}`
14. Turn the rule on.
15. Test: raise a request from the portal — "Where do I enable 2FA?" —
    and the reply comment appears with the guided link.

### Try it without Jira

```bash
npm run server    # terminal 1
npm run example    # terminal 2
# terminal 3 — pretend to be Jira Automation:
curl -s -X POST http://localhost:8787/api/connectors/jira/automation \
  -H "content-type: application/json" \
  -H "x-guidance-demo-secret: $(grep JIRA_AUTOMATION_SECRET packages/server/.env | cut -d= -f2)" \
  -d '{"issueKey":"SUP-1","summary":"Where do I enable 2FA?","reporterEmail":"demo@user.test"}'
# with the demo app already open as demo@user.test, an Allow/Dismiss card
# appears in at most one poll interval. The handoffUrl remains usable too.
```

### Debugging

- **Comment is empty** → "Wait for response" is not checked, or the backend
  didn't return `Content-Type: application/json`.
- Log the raw response inside the rule with a comment/log action containing
  `{{webhookResponse.body}}`, and check **Automation → Audit log** for the
  web-request status code.
- `401` in the audit log → header name/value mismatch with
  `JIRA_AUTOMATION_SECRET`. `503` → the secret isn't set server-side.
- Link opens the app but nothing highlights → token expired (15 min) or the
  demo app isn't running on `DEMO_APP_URL`; the widget will say which.

### Security model (demo scope)

- Webhook requires the shared-secret header; requests are rate-limited and
  the Jira payload is length-capped and never echoed back into the comment
  (the reply is registry text + our own URL, nothing user-controlled).
- Handoff tokens: 24 random bytes, single purpose, 15-minute expiry; the URL
  carries only the token — no customer data. Every fetch/completion is
  audited server-side with `createdAt/expiresAt/issueKey/tenantId/intent`.
- The plan is data, not commands: the SDK re-validates everything client-side
  — planned clicks still require the user's explicit approval, and
  high-risk targets (billing, delete, password, payment, submit, …) are
  highlight-only even if the backend said click.
- Pending delivery normalizes emails (trim + lowercase), has one newest-wins
  slot per address, expires with the token, and is consumed after one poll.
  It exposes only `{ token, intent, replyPreview }`; reporter identity and
  Jira issue contents never reach the browser. Email values are never logged;
  audit records use a short hash.

### Production hardening (required before real use)

**Email-claimed identity is spoofable in this demo.** A person who polls the
pending endpoint with somebody else's email could receive that person's
guidance pop-up. This is accepted only to keep the JSM Free demo simple.

In production, the SaaS backend must vouch for the logged-in identity: issue a
short-lived signed session token to the SDK, have this backend verify it, and
derive the delivery identity from the verified claims rather than a query
parameter. Apply normal authentication, tenant authorization, durable storage,
and shared rate limiting before exposing this endpoint publicly.

## Where each piece runs

- `packages/sdk` — pure client code, no server dependency of its own.
- `packages/ai-proxy-core` — pure backend logic, no server framework of its
  own; both `packages/server` and `apps/landing/api/ai-proxy.ts` import it.
- `packages/server` / `apps/landing` — the only things that hold an
  OpenRouter key; the widget never calls an LLM provider directly from the
  browser.
- `examples/nextjs-loginwithchatgpt` and `apps/landing` both depend on
  `packages/sdk` (and `apps/landing` on `ai-proxy-core` too) via npm
  workspaces — no manual file copying, rebuild the SDK and every consumer
  picks it up on next reload.

`apps/` vs `examples/`: `apps/landing` is a real product someone actually
ships; `examples/` are minimal, disposable integration demos.
