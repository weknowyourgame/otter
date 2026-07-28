# Railway deployment

This repo deploys as separate Railway services from the repository root so Bun
workspaces and `packages/*` are available during each build.

## Services

| Service | Config file | Healthcheck |
| --- | --- | --- |
| Dashboard (`apps/web`) | `railway.json` | `/health` |
| API (`apps/api`) | `railway/api.json` | `/health` |
| Workers (`apps/workers`) | `railway/workers.json` | `/health` |
| Landing (`apps/landing`) | `railway/landing.json` | `/health` |

For the API, workers, and landing services, set Railway's config-as-code path to
the matching file above. The root `railway.json` is the default dashboard
service config.

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
RESEND_API_KEY=...
EMAIL_FROM=Otter <support@your-domain.com>
```

Workers:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
OPENROUTER_API_KEY=...
FIRECRAWL_API_KEY=...
FIRECRAWL_CRAWL_LIMIT=50
FIRECRAWL_MAX_CONCURRENCY=2
FIRECRAWL_ALLOW_SUBDOMAINS=0
```
