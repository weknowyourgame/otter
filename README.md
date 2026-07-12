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
