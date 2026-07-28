---
title: Otter Docs
description: The short version of how Otter is installed, trained, and run.
---

## What Otter Does

Otter is an embeddable AI support agent for web apps. A customer asks for help, grants permission, and Otter can answer from your knowledge base or operate the product UI by navigating, clicking, and filling fields.

The running product has four main pieces:

- `apps/api` handles auth, API keys, origin checks, dashboard APIs, and the agent `/step` loop.
- `apps/web` is the dashboard and the in-app Cordant demo surface.
- `apps/workers` crawls websites with Firecrawl, chunks pages, embeds them, and stores searchable knowledge.
- `packages/sdk` is the widget that serializes the current page and executes approved actions.

## Core Flow

1. Create an account and verify email.
2. Name the organization.
3. Generate a widget key and register an allowed origin.
4. Configure the agent behavior.
5. Add knowledge from websites, FAQs, or files.
6. Embed the widget in the customer website.

## Demo Notes

For local demos, run the dashboard, API, worker, Postgres, and Redis. The Cordant demo mounts the SDK like a customer app: set `NEXT_PUBLIC_OTTER_API_URL` to the main API, set `NEXT_PUBLIC_OTTER_PUBLIC_KEY`, and add the exact demo origin in Settings -> Developers.
