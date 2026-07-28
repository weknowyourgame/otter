---
title: Quickstart
description: Start Otter locally and connect the widget to the main API.
---

## Local Services

Start backing services first:

```bash
docker compose up -d
```

Install and build:

```bash
bun install
bun run build
```

Run the local apps:

```bash
bun run dev:all
```

The usual local ports are:

- Landing: `http://localhost:3000`
- Dashboard: `http://localhost:3001`
- API: `http://localhost:8787`
- Workers: local BullMQ with `bun run workers`, or Cloudflare local mode with `bun run workers:cloudflare`

## Required Environment

The API needs `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `OTTER_API_KEY_SECRET`, `OTTER_DASHBOARD_ORIGINS`, `OPENROUTER_API_KEY`, and Resend settings for real email.

Local BullMQ workers need `DATABASE_URL`, `REDIS_URL`, `OPENROUTER_API_KEY`,
and `FIRECRAWL_API_KEY`. Cloudflare local mode needs `apps/workers/.dev.vars`
with `OTTER_API_URL` and `OTTER_WORKER_SECRET`, while the API owns
`FIRECRAWL_API_KEY` and `OPENROUTER_API_KEY`.

## First Tenant

Sign up in the dashboard, verify email, name the organization, generate a public key, and add the exact origin that will load the widget.
