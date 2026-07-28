---
title: Knowledge
description: How Otter ingests website, FAQ, and file knowledge.
---

## Website Crawls

Web sources use Firecrawl's crawl API. Otter starts a bounded crawl from the URL you submit, stays on the same domain by default, follows internal pages, and stores each discovered page as source-labeled chunks.

The useful worker knobs are:

```bash
FIRECRAWL_CRAWL_LIMIT=50
FIRECRAWL_MAX_CONCURRENCY=2
FIRECRAWL_ALLOW_SUBDOMAINS=0
```

## FAQs

FAQ entries are stored as knowledge docs immediately. They are chunked, embedded, and searchable without going through the web-crawl queue.

## Files

Text and Markdown files are indexed as searchable content. Other file formats may be stored as metadata until dedicated extraction is added.

## Retrieval

When the agent needs product context, it calls the knowledge search tool. Search is tenant-scoped and retrieves embedded chunks from Postgres.

