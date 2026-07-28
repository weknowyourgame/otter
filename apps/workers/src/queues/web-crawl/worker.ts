// Local/BullMQ wrapper. The crawl processor itself lives in otter-web-crawl
// so Cloudflare-triggered API jobs and local workers share one code path.

import { type Job, Worker } from "bullmq";
import {
	FirecrawlService,
	processWebCrawlJob as processSharedWebCrawlJob,
} from "otter-web-crawl";
import { QUEUE_NAMES, type WebCrawlJobData } from "otter-jobs";
import type { RedisOptions } from "otter-redis";

type WorkerConfig = {
	connection: RedisOptions;
	firecrawlApiKey: string | undefined;
	openRouterApiKey: string | undefined;
};

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
	await processSharedWebCrawlJob(data, {
		firecrawl,
		openRouterApiKey,
		logPrefix: "[worker:web-crawl]",
	});
}
