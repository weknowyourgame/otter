# example: nextjs-loginwithchatgpt

A minimal Next.js App Router example, structured after the real
[loginwithchatgpt](https://github.com/weknowyourgame/loginwithchatgpt) site,
showing the SDK's programmatic (npm import) integration path — the pattern a
real React/Next.js app should use instead of a raw `<script>` tag.

See `components/ai-widget-mount.tsx` — it's the entire integration:

```tsx
"use client";
import { useEffect } from "react";
import { init } from "ai-widget-sdk";

export function AIWidgetMount() {
  useEffect(() => {
    const widget = init({ proxyUrl: "http://localhost:8787/api/ai-proxy" });
    return () => widget.destroy();
  }, []);
  return null;
}
```

## Run it

From the monorepo root:

```bash
npm install
npm run build          # builds packages/sdk
npm run server          # terminal 1 — starts packages/server on :8787
npm run example          # terminal 2 — starts this app on :3000
```

Open `http://localhost:3000`, click the chat bubble, and try:

- **"take me to getting started"** or **"open docs"** — real click, navigates
  via the actual link (in-page anchor here, but the same code path handles a
  full page navigation on a real site).
- **"where is how it works"** — scroll + highlight only, no click, since it's
  a "where is" question rather than a "take me to" one.
- **"delete my account"** — the page has a real Delete Account button. The
  widget will only ever highlight it, never click it — that's enforced
  client-side regardless of what the AI backend proposes.
