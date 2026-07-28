# Railway deployment

This repo deploys as separate Railway services from the repository root so Bun
workspaces and `packages/*` are available during each build.

## Services

| Service | Config file | Healthcheck |
| --- | --- | --- |
| Dashboard (`apps/web`) | `railway.json` | `/health` |
| API (`apps/api`) | `railway/api.json` | `/health` |
| Landing (`apps/landing`) | `railway/landing.json` | `/health` |

For the API and landing services, set Railway's config-as-code path to the
matching file above. The root `railway.json` is the default dashboard service
config. Web-crawl workers run through Cloudflare Workers + Queues, not Railway.

## Required variables

Dashboard:

```bash
OTTER_API_URL=https://your-api.up.railway.app
NEXT_PUBLIC_OTTER_PUBLIC_KEY=pk_live_...
```

API:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
BETTER_AUTH_URL=https://your-api.up.railway.app
BETTER_AUTH_SECRET=...
OTTER_API_KEY_SECRET=...
OTTER_DASHBOARD_ORIGINS=https://your-dashboard.up.railway.app
OPENROUTER_API_KEY=...
WEB_CRAWL_BACKEND=cloudflare
CLOUDFLARE_WEB_CRAWL_ENQUEUE_URL=https://otter-web-crawl-worker.<account>.workers.dev/enqueue
OTTER_WORKER_SECRET=...
FIRECRAWL_API_KEY=...
RESEND_API_KEY=...
EMAIL_FROM=Otter <support@your-domain.com>
```

Cloudflare web-crawl worker (`apps/workers`):

```bash
OTTER_API_URL=https://your-api.up.railway.app
OTTER_WORKER_SECRET=...
```

For local Cloudflare testing, copy `apps/workers/.dev.vars.example` to
`apps/workers/.dev.vars`, use the same `OTTER_WORKER_SECRET` in `apps/api/.env`,
then run `bun run workers:cloudflare`.
