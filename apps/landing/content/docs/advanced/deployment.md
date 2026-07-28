---
title: Deployment
description: The services and environment variables needed outside localhost.
---

## Services

Deploy Otter as separate services:

- Dashboard: `apps/web`
- API: `apps/api`
- Web-crawl worker: `apps/workers` on Cloudflare Workers + Queues
- Landing: `apps/landing`
- Postgres
- Redis

Railway configs live in `railway/` for the dashboard, API, and landing. Render
config has been removed. The web-crawl worker uses `apps/workers/wrangler.toml`.

## Critical Variables

The dashboard must set `OTTER_API_URL` to the real deployed API. The API must set `OTTER_DASHBOARD_ORIGINS` to the real dashboard origin. Widget keys only work from exact allowed origins.

In Cloudflare mode, the API must set `WEB_CRAWL_BACKEND=cloudflare`,
`CLOUDFLARE_WEB_CRAWL_ENQUEUE_URL`, `OTTER_WORKER_SECRET`, `FIRECRAWL_API_KEY`,
and `OPENROUTER_API_KEY`. The Cloudflare Worker only needs `OTTER_API_URL` and
the same `OTTER_WORKER_SECRET`.

## Current Non-Code Decisions

Billing still needs a provider and product rules. Keep billing as the only intentionally presentational area until that decision is made.
