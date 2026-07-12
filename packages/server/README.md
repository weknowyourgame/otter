# AI Widget — standalone

Test the Nanobrowser-style AI DOM widget (observe → propose → approve → scroll+highlight)
on **any** website via a bookmarklet, with real AI matching from a local server.

## Setup

```bash
cd ai-widget-standalone
cp .env.example .env   # add your OpenRouter key (optional — see below)
npm start
```

This starts a local server on `http://localhost:8787` that serves the widget
script and proxies AI requests to OpenRouter (free `nvidia/nemotron-nano-9b-v2:free`
model). Your API key stays on this server — it is never sent to the browser
or to whatever site you inject the widget into.

If you skip the `.env` key, the server still runs and the widget still works —
it just falls back to a local keyword matcher instead of real AI.

## Use it on any site

1. Open `http://localhost:8787/bookmarklet` in your browser.
2. Drag the "Inject AI Widget" link to your bookmarks bar.
3. Go to any website (with the local server still running).
4. Click the bookmarklet. A chat bubble appears bottom-right.
5. Ask it something, e.g. "where is pricing?" — it'll propose scrolling to
   and highlighting the matching element, and wait for you to click **Allow**
   before touching anything.

Since the widget only knows generic keywords (pricing, sign up, FAQ, contact
sales) and whatever text is actually on the page, it works best on sites that
literally use words like "Pricing" or "Sign up" somewhere. Sites that add
`data-ai-section="..."` / `data-ai-action="..."` attributes (see the widget's
`observe()` in `ai-widget.js`) will match more precisely.

## Files

- `ai-widget.js` — the widget itself (same code as `stealth-markets/public/ai-widget.js`).
  Reads `data-ai-proxy-url` off its own `<script>` tag to know where to send AI requests,
  since a relative path would otherwise resolve against whichever page it's injected into.
- `server.js` — plain Node `http` server (no dependencies). Serves the widget,
  the bookmarklet page, and `/api/ai-proxy`.

## Notes

- No autonomous clicking — the widget only ever scrolls to and highlights
  elements, and only after you approve.
- The highlight overlay auto-fades after ~5s (or press Escape).
- Restart the server (`npm start`) after editing `ai-widget.js` or `server.js`.
