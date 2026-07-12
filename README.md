# ai-widget-monorepo

An embeddable, approval-gated AI DOM assistant: it observes the page,
proposes an action ("I found the docs link, want me to open it?"), waits
for you to click **Allow**, then scrolls to / highlights / clicks the
matching element.

```
packages/
  sdk/      the client widget (TypeScript -> esbuild -> script-tag + npm builds)
  server/   reference AI backend: plain Node http server, calls OpenRouter's
            free nvidia/nemotron-nano-9b-v2:free model, zero dependencies
examples/
  nextjs-loginwithchatgpt/   minimal Next.js app showing the npm/import
                             integration path (the pattern a real React app
                             should use, as opposed to a raw <script> tag)
```

## Quick start

```bash
npm install
npm run build     # builds packages/sdk -> packages/sdk/dist
npm run server     # terminal 1: AI proxy on http://localhost:8787
npm run example     # terminal 2: example app on http://localhost:3000
```

`packages/server/.env` needs `OPENROUTER_API_KEY` for real AI matching
(get one free at openrouter.ai/keys). Without it, the widget still works —
it falls back to a local keyword matcher, no LLM required.

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
- `packages/server` — the only thing that holds your OpenRouter key; the
  widget never calls an LLM provider directly from the browser.
- `examples/nextjs-loginwithchatgpt` — depends on `packages/sdk` via npm
  workspaces (no manual file copying — rebuild the SDK and the example picks
  it up on next reload).
