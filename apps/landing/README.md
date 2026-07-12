# Stealth Markets

Privacy-first prediction markets on Horizen.

Stealth Markets is a waitlist landing page for confidential prediction market participation: hidden positions, private trading, and selective disclosure for verification or compliance.

## Run

```bash
npm install
npm run dev
npm run build
```

## AI support widget (proof of concept)

`public/ai-widget.js` is a small embedded script (plain `<script src="/ai-widget.js">`,
no build step) that proves a Nanobrowser-style DOM control layer can run from a
normal page — no Chrome extension, no Playwright/Browserbase, no remote browser.

**How it works:**

1. `observe()` walks the visible DOM (buttons, links, inputs, sections, headings,
   `[data-ai-action]` / `[data-ai-section]` elements) and returns a JSON snapshot
   with a stable `el_N` id per element.
2. You ask the chat bubble (bottom-right) a question. `proposeAction()` sends
   your message + the snapshot to `/api/ai-proxy`, which calls a **free**
   OpenRouter model (`nvidia/nemotron-nano-9b-v2:free`) server-side to pick the
   matching element. If that endpoint is unreachable, it falls back to a local
   keyword matcher — the demo always works either way.
3. The widget shows an approval card ("Allow" / "Cancel"). Nothing happens
   until you click **Allow**.
4. Only then does it `scrollTo()` + `highlight()` the element (a fixed overlay
   with a spotlight-dim effect). **Clicking is not implemented** — `executeAction()`
   has a disabled `case "click"` clearly marked as future work.

**Security note:** the OpenRouter key lives in `.env` / `OPENROUTER_API_KEY` and
is only ever read server-side (`api/_ai.ts`, used by both `api/ai-proxy.ts` for
production and a Vite dev-server middleware for `npm run dev`). It is never
sent to the browser — do not move the OpenRouter call into `public/ai-widget.js`.

**Try it:** run `npm run dev`, open the page, click the chat bubble, and ask:

- "Where is pricing?" → highlights the services section (`data-ai-section="pricing"`)
- "How do I sign up?" → highlights the waitlist email pill (`data-ai-action="start-signup"`)
- "I want to contact sales" → no real contact-sales element on this page, so it
  replies that it couldn't find one (demonstrates the no-match path)
- "Show me the FAQ" → same — no FAQ section exists here, another no-match demo

Open the browser devtools console and use `window.StealthAIWidgetBridge` to
call `observe()`, `proposeAction()`, `highlight()`, etc. directly for testing.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
