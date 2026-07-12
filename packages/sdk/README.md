# ai-widget-sdk

Part of the [ai-widget-monorepo](../../README.md) — see that for the paired
backend (`../server`) and a runnable example (`../../examples`).

An embeddable, approval-gated AI DOM assistant. It observes the visible page,
proposes an action ("I found the docs link, want me to open it?"), waits for
the user to click **Allow**, then scrolls to / highlights / clicks the
matching element. Every click is independently re-validated against the live
DOM right before it fires — see [Safety](#safety).

Ships as a single `<script>` tag (zero build step) or an npm/ESM import for
bundled apps. No Chrome extension, no Playwright/Browserbase, no remote
browser — it's normal browser JavaScript running on your own page.

**This package is the client widget only.** You still need a backend that
receives `{ message, elements }` and returns `{ ok, targetId, action, reply }`
by calling an LLM — see [Backend](#backend) below. Without one, the widget
still works using a built-in local keyword matcher, so it degrades gracefully
rather than breaking.

## Install

Not published to npm — this is a local package. Either:

- **Script tag**: build it (`npm install && npm run build`) and copy
  `dist/ai-widget-sdk.global.js` to wherever you host static assets.
- **npm import**: `npm install /path/to/ai-widget-sdk` (or copy the package
  into your monorepo) and `import { init } from "ai-widget-sdk"`.

## Quick start — script tag (no build step)

```html
<script
  src="/ai-widget-sdk.global.js"
  data-ai-proxy-url="https://your-backend.example.com/api/ai-proxy"
></script>
```

That's it — it auto-injects a chat bubble bottom-right on page load.

## Quick start — programmatic (React, Vue, SPAs)

```ts
import { init } from "ai-widget-sdk";

const widget = init({
  proxyUrl: "https://your-backend.example.com/api/ai-proxy",
  title: "Acme Assistant",
  userEmail: "signed-in@example.com", // enables demo pending-handoff polling
});

// later, e.g. on route change / unmount:
widget.destroy();
```

If you load the script-tag build but want manual control instead of
auto-inject, add `data-auto-init="false"` and call `window.AIWidgetSDK.init({...})`
yourself.

## Config reference

| Option | Default | Notes |
|---|---|---|
| `proxyUrl` | `/api/ai-proxy` | Your backend endpoint. Absolute URL if it's cross-origin. |
| `authHeader` / `authToken` | — | Sent as a header on every proxy request, e.g. a per-tenant shared secret. |
| `position` | `"bottom-right"` | or `"bottom-left"` |
| `accentColor` | `#7cf7c4` | Highlight border/glow color |
| `bubbleIcon` | `💬` | Any emoji/short text |
| `title` | `"Ask about this page"` | Chat panel header |
| `greeting` | generic | First assistant message |
| `placeholder` | `"Ask a question…"` | Input placeholder |
| `highlightAutoClearMs` | `5000` | Highlight auto-fades after this long (also dismissible with Escape) |
| `riskyWords` | — | Extra words merged into the built-in risky-word list (see [Safety](#safety)) |
| `maxElements` | `200` | Cap on elements per `observe()` snapshot |
| `requestTimeoutMs` | `16000` | AI proxy request timeout before falling back locally |
| `guidanceBaseUrl` | same origin | Guidance backend for token handoffs and pending delivery polling |
| `userEmail` | — | Demo identity for a visible-tab, 5-second pending-handoff poll (stops after 30 min) |

All the same options are settable as `data-ai-*` attributes on a script tag
(camelCase → kebab-case, e.g. `accentColor` → `data-ai-accent-color`).
For example, `userEmail` maps to `data-ai-user-email`.

## Seamless support handoff

When a support system resolves a request, the backend can keep the normal
link/comment fallback and additionally expose a one-time pending handoff for
the signed-in customer. Configure `guidanceBaseUrl` and `userEmail`; while the
tab is visible, the SDK polls every five seconds (for at most 30 minutes). A
received handoff opens the panel with **Allow** / **Dismiss**. Allow fetches
the existing token plan and runs the existing safe handoff executor; Dismiss
records `user_dismissed`. Use `instance.identify(email)` if identity changes
without remounting the widget.

`userEmail` is intentionally demo-grade and must not be trusted in production:
the SaaS backend should provide a short-lived, backend-verifiable identity
token instead of allowing a browser to claim an email address.

## How matching works

1. `observe()` walks the visible DOM for buttons, links, inputs, sections,
   headings, and anything tagged `data-ai-action="..."` / `data-ai-section="..."`.
2. On a user message, the snapshot + message go to your `proxyUrl`. Your
   backend should call an LLM and return the id of the best-matching element
   (or `null`) plus a proposed action. **There are no hardcoded intents** —
   tag your important elements with `data-ai-section`/`data-ai-action` for
   the highest-precision matches, but the LLM can also just reason over
   visible text.
3. If the proxy is unreachable, a local matcher scores elements by keyword
   overlap with the user's message (no LLM, no hardcoded categories), and
   guesses `click` vs. `scrollAndHighlight` from simple navigational phrases
   ("take me to", "open", "go to") — the widget always does *something*
   useful, even fully offline.

## Backend

You need one endpoint. Contract:

```
POST { message: string, elements: Array<{ id, tag, text, role, ariaLabel, aiAction, aiSection }> }
→ { ok: boolean, targetId: string | null, action: "scrollAndHighlight" | "click" | "none", reply: string }
```

**Never call your LLM provider directly from this widget or from client-side
JS in general** — your API key would be readable by anyone via view-source.
Reference implementation: `../server` — plain Node `http` server, zero
dependencies, calls OpenRouter's free `nvidia/nemotron-nano-9b-v2:free` model.

Whatever you build, validate that the model's `targetId` is actually one of
the ids you sent it. The `action` field it returns is advisory only — it's a
UX hint for which verb to show the user ("open" vs "show"). **The SDK client
does not trust it**; see Safety below for where the real decision is made.

## Safety

- The widget **never executes anything without an explicit "Allow" click** in
  the chat UI.
- `click` is real — clicking a link navigates, clicking a button fires it.
  But **the SDK client, not your backend or the LLM, makes the final call on
  whether a click is safe**, re-checked against the live DOM immediately
  before firing, every time — including if you call `executeAction()`
  directly via the bridge, bypassing `proposeAction()` entirely. A proposed
  click is downgraded to highlight-only whenever:
  - the element's text/selector matches a risky word (delete, payment,
    password, confirm, purchase, checkout, billing, submit, account
    deletion, etc. — extend the list with `riskyWords`), or
  - it's an actual form-submit control (`<button type="submit">` inside a
    `<form>`, or `<input type="submit">`) — checked structurally, since a
    submit button's visible text ("Continue", "Subscribe") won't always
    contain a risky keyword, or
  - it isn't a real interactive element (not a link, button, `role="button"`,
    or `data-ai-action`-tagged element), or
  - it's currently disabled.

  There is no config flag to turn this off.
- Every element's `risk` field in the `observe()` snapshot reflects the same
  check, so your backend/LLM can reason about it too — but it's the client
  recheck that's actually load-bearing.

## Multi-tenant / auth

If your backend serves multiple customers, use `authHeader` + `authToken` to
send a per-tenant token with every request, and validate it server-side
before calling your LLM — this also stops randoms from hitting your endpoint
and burning your model quota if `proxyUrl` is ever guessable.

## Development

```bash
npm install
npm run build   # esbuild → dist/ai-widget-sdk.{esm,global}.js + dist/types
npm run dev     # same, in watch mode
```

Try the raw script-tag examples (needs a proxy running — `npm run server` from
the monorepo root):

```bash
python3 -m http.server 8890   # from this package's root
# open http://localhost:8890/examples/script-tag.html
# open http://localhost:8890/examples/programmatic.html
```

For a full framework example, see `../../examples/nextjs-loginwithchatgpt`.

## Publishing

This is `"private": true` on purpose — nothing here has been published
anywhere. To publish under your own org: remove `private`, pick a real
package name/version, `npm run build`, `npm publish`.
