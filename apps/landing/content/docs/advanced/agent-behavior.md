---
title: Agent Behavior
description: How the live Otter agent decides and acts.
---

## Agent Turns

Widget traffic calls the main API `/step` endpoint. The SDK sends the user message, current page snapshot, session id, and last action result. The API validates the tenant key, checks the request origin, loads tenant agent configuration, then runs `otter-core`.

The model is pinned to `openai/gpt-5.3-codex`.

## Tools

The runtime tool set includes:

- `click`
- `fill`
- `navigate`
- `scroll`
- `say`
- `done`
- `fail`
- `search_knowledge_base`
- `remember`
- `forget`

The SDK asks for consent before acting and keeps a stop control visible while browser actions are running.

## Memory

Memory is tenant-scoped and tied to the user/session context available to the widget. The agent can remember durable preferences and recall them in later conversations.

