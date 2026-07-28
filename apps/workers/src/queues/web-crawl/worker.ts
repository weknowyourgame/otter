// Deliberately scoped: no global crawl-slot leasing, no per-website realtime
// event emission, no plan-based size limits. Just crawl a bounded website,
// chunk it, store it, and mark the doc ready or failed.

import { type Job, Worker } from "bullmq";
import { requestEmbedding } from "otter-core";
import {
	replaceChunksForDoc,
	setChunkEmbedding,
	updateDocStatus,
} from "otter-db";
import { QUEUE_NAMES, type WebCrawlJobData } from "otter-jobs";
import type { RedisOptions } from "otter-redis";
import { type CrawlPage, FirecrawlService } from "../../services/firecrawl.js";
import { chunkMarkdown } from "../../text-chunker.js";

type WorkerConfig = {
	connection: RedisOptions;
	firecrawlApiKey: string | undefined;
	openRouterApiKey: string | undefined;
};

function hostnameFor(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
}

function documentTitle(
	url: string,
	title: string | null,
	pageCount: number,
): string {
	const baseTitle = title ?? hostnameFor(url);
	return pageCount === 1 ? baseTitle : `${baseTitle} (${pageCount} pages)`;
}

function chunksForPage(page: CrawlPage): string[] {
	const title = page.title ?? page.url;
	return chunkMarkdown(page.markdown).map(
		(content) => `# ${title}\nSource: ${page.url}\n\n${content}`,
	);
}

export function createWebCrawlWorker({
	connection,
	firecrawlApiKey,
	openRouterApiKey,
}: WorkerConfig) {
	const firecrawl = new FirecrawlService(firecrawlApiKey);
	let worker: Worker<WebCrawlJobData> | null = null;

	return {
		start: async () => {
			if (worker) return;

			worker = new Worker<WebCrawlJobData>(
				QUEUE_NAMES.WEB_CRAWL,
				async (job: Job<WebCrawlJobData>) =>
					processWebCrawlJob(firecrawl, openRouterApiKey, job.data),
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

export async function processWebCrawlJob(
	firecrawl: FirecrawlService,
	openRouterApiKey: string | undefined,
	data: WebCrawlJobData,
): Promise<void> {
	const { docId, url } = data;

	if (!firecrawl.isConfigured()) {
		await updateDocStatus(docId, {
			status: "failed",
			errorMessage: "Firecrawl API is not configured",
			updatedAt: Date.now(),
		});
		throw new Error("Firecrawl API is not configured");
	}

	await updateDocStatus(docId, { status: "crawling", updatedAt: Date.now() });

	const result = await firecrawl.crawlWebsite(url);
	if (!result.success) {
		await updateDocStatus(docId, {
			status: "failed",
			errorMessage: result.error,
			updatedAt: Date.now(),
		});
		throw new Error(result.error);
	}

	const chunkTexts = result.pages.flatMap(chunksForPage);
	const now = Date.now();
	const insertedChunks = await replaceChunksForDoc(
		docId,
		chunkTexts.map((content, i) => ({
			id: `${docId}:${i}`,
			docId,
			content,
			embedding: null,
			createdAt: now,
		})),
	);

	// Embeddings are best-effort here: a doc without them still stores its
	// raw content, it's just invisible to vector-search's retrieval (which
	// only looks at chunks with a non-null embedding) until re-ingested with
	// a key configured. Not worth failing the whole ingestion over.
	if (openRouterApiKey) {
		let embedded = 0;
		for (const chunk of insertedChunks) {
			try {
				const embedding = await requestEmbedding(
					chunk.content,
					openRouterApiKey,
				);
				await setChunkEmbedding(chunk.id, JSON.stringify(embedding));
				embedded++;
			} catch (error) {
				console.error(
					`[worker:web-crawl] Failed to embed chunk ${chunk.id}`,
					error,
				);
			}
		}
		console.log(
			`[worker:web-crawl] Embedded ${embedded}/${insertedChunks.length} chunks for doc ${docId}`,
		);
	} else {
		console.warn(
			`[worker:web-crawl] OPENROUTER_API_KEY not set — doc ${docId} stored but not searchable yet`,
		);
	}

	await updateDocStatus(docId, {
		status: "ready",
		title: documentTitle(url, result.title, result.pages.length),
		errorMessage: null,
		updatedAt: Date.now(),
	});
	console.log(
		`[worker:web-crawl] Ingested ${url} -> ${result.pages.length} pages, ${chunkTexts.length} chunks (doc ${docId})`,
	);
}
