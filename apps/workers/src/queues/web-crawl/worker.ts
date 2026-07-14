// Deliberately scoped down from cossistant/apps/workers/src/queues/web-crawl
// worker.ts: no global crawl-slot leasing (that's for bounding concurrent
// Firecrawl usage across many tenants — Otto has none of that yet), no
// per-website realtime event emission (no website/tenant concept since
// Phase 5 is on hold), no plan-based size limits (no billing). Just:
// fetch one page, chunk it, store it, mark the doc ready or failed.

import { updateDocStatus, replaceChunksForDoc } from "otto-db";
import type { RedisOptions } from "otto-redis";
import { QUEUE_NAMES, type WebCrawlJobData } from "otto-jobs";
import { Job, Worker } from "bullmq";
import { chunkMarkdown } from "../../text-chunker.js";
import { FirecrawlService } from "../../services/firecrawl.js";

type WorkerConfig = {
	connection: RedisOptions;
	firecrawlApiKey: string | undefined;
};

export function createWebCrawlWorker({ connection, firecrawlApiKey }: WorkerConfig) {
	const firecrawl = new FirecrawlService(firecrawlApiKey);
	let worker: Worker<WebCrawlJobData> | null = null;

	return {
		start: async () => {
			if (worker) return;

			worker = new Worker<WebCrawlJobData>(
				QUEUE_NAMES.WEB_CRAWL,
				async (job: Job<WebCrawlJobData>) => processWebCrawlJob(firecrawl, job.data),
				{ connection, concurrency: 2 },
			);

			worker.on("failed", (job, error) => {
				console.error(`[worker:web-crawl] Job ${job?.id} failed`, error);
			});

			await worker.waitUntilReady();
			console.log("[worker:web-crawl] Worker ready");
		},
		stop: async () => {
			if (worker) {
				await worker.close();
				worker = null;
			}
		},
	};
}

export async function processWebCrawlJob(firecrawl: FirecrawlService, data: WebCrawlJobData): Promise<void> {
	const { docId, url } = data;

	if (!firecrawl.isConfigured()) {
		updateDocStatus(docId, { status: "failed", errorMessage: "Firecrawl API is not configured", updatedAt: Date.now() });
		throw new Error("Firecrawl API is not configured");
	}

	updateDocStatus(docId, { status: "crawling", updatedAt: Date.now() });

	const result = await firecrawl.scrapeSinglePage(url);
	if (!result.success) {
		updateDocStatus(docId, { status: "failed", errorMessage: result.error, updatedAt: Date.now() });
		throw new Error(result.error);
	}

	const chunkTexts = chunkMarkdown(result.markdown);
	const now = Date.now();
	replaceChunksForDoc(
		docId,
		chunkTexts.map((content, i) => ({
			id: `${docId}:${i}`,
			docId,
			content,
			embedding: null,
			createdAt: now,
		})),
	);

	updateDocStatus(docId, { status: "ready", title: result.title, errorMessage: null, updatedAt: Date.now() });
	console.log(`[worker:web-crawl] Ingested ${url} -> ${chunkTexts.length} chunks (doc ${docId})`);
}
