---
title: Deployment
description: The services and environment variables needed outside localhost.
---

## Services

Deploy Otter as separate services:

- Dashboard: `apps/web`
- API: `apps/api`
- Workers: `apps/workers`
- Landing: `apps/landing`
- Postgres
- Redis

Railway configs live in `railway/`. Render config has been removed.

## Critical Variables

The dashboard must set `OTTER_API_URL` to the real deployed API. The API must set `OTTER_DASHBOARD_ORIGINS` to the real dashboard origin. Widget keys only work from exact allowed origins.

Workers must have `FIRECRAWL_API_KEY` for website imports and `OPENROUTER_API_KEY` for embeddings.

## Current Non-Code Decisions

Billing still needs a provider and product rules. Keep billing as the only intentionally presentational area until that decision is made.

