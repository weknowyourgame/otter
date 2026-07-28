import { getSafeRedisUrl, type RedisOptions } from "otter-redis";
import { type JobsOptions, Queue } from "bullmq";
import { QUEUE_NAMES, type WebCrawlJobData } from "../types.js";
import { addUniqueJob } from "../utils/unique-job.js";

const WEB_CRAWL_RETRY_ATTEMPTS = 3;
const WEB_CRAWL_RETRY_BASE_DELAY_MS = 60 * 1000;

type FetchLike = (
	input: string,
	init: {
		method: string;
		headers: Record<string, string>;
		body: string;
	},
) => Promise<{
	ok: boolean;
	status: number;
	json(): Promise<unknown>;
	text(): Promise<string>;
}>;

type BullMqTriggerConfig = {
	backend?: "bullmq";
	connection: RedisOptions;
	redisUrl: string;
};

type CloudflareTriggerConfig = {
	backend: "cloudflare";
	enqueueUrl: string;
	secret: string;
	fetchImpl?: FetchLike;
};

type TriggerConfig = BullMqTriggerConfig | CloudflareTriggerConfig;

function createCloudflareWebCrawlTriggers(config: CloudflareTriggerConfig) {
	const fallbackFetch = (globalThis as unknown as { fetch?: FetchLike }).fetch;
	const maybeFetcher = config.fetchImpl ?? fallbackFetch;
	if (!maybeFetcher)
		throw new Error("fetch is not available for Cloudflare web-crawl enqueue");
	const fetcher: FetchLike = maybeFetcher;

	async function enqueueWebCrawl(data: WebCrawlJobData): Promise<string> {
		const response = await fetcher(config.enqueueUrl, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-otter-worker-secret": config.secret,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const detail = await response.text();
			throw new Error(
				`Cloudflare web-crawl enqueue failed: ${response.status} ${detail || "no body"}`,
			);
		}

		const body = await response.json().catch(() => ({}));
		const jobId =
			body &&
			typeof body === "object" &&
			"jobId" in body &&
			typeof body.jobId === "string"
				? body.jobId
				: `web-crawl-${data.docId}`;
		console.log(
			`[jobs:web-crawl] Enqueued Cloudflare job ${jobId} for doc ${data.docId}`,
		);
		return jobId;
	}

	return {
		enqueueWebCrawl,
		close: async (): Promise<void> => {},
	};
}

function createBullMqWebCrawlTriggers({
	connection,
	redisUrl,
}: BullMqTriggerConfig) {
	const queueName = QUEUE_NAMES.WEB_CRAWL;
	let queue: Queue<WebCrawlJobData> | null = null;
	let readyPromise: Promise<void> | null = null;
	const safeRedisUrl = getSafeRedisUrl(redisUrl);

	function getQueue(): Queue<WebCrawlJobData> {
		if (!queue) {
			console.log(
				`[jobs:web-crawl] Using queue=${queueName} redis=${safeRedisUrl}`,
			);
			queue = new Queue<WebCrawlJobData>(queueName, {
				connection,
				defaultJobOptions: {
					removeOnComplete: { count: 100 },
					removeOnFail: { count: 100 },
				},
			});
		}
		return queue;
	}

	async function ensureQueueReady(): Promise<Queue<WebCrawlJobData>> {
		const q = getQueue();
		if (!readyPromise) {
			readyPromise = q.waitUntilReady().then(
				() =>
					console.log("[jobs:web-crawl] Queue connection ready for producers"),
				(error) => {
					console.error(
						"[jobs:web-crawl] Failed to initialize queue connection",
						error,
					);
					throw error;
				},
			);
		}
		await readyPromise;
		return q;
	}

	async function enqueueWebCrawl(data: WebCrawlJobData): Promise<string> {
		const q = await ensureQueueReady();
		// BullMQ rejects jobIds containing exactly one ":" (that syntax is
		// reserved for repeatable jobs) — found by actually running this and
		// hitting "Custom Id cannot contain :". Hyphen keeps IDs readable
		// without triggering BullMQ's repeatable-job parser.
		const jobId = `web-crawl-${data.docId}`;

		const jobOptions: JobsOptions = {
			jobId,
			attempts: WEB_CRAWL_RETRY_ATTEMPTS,
			backoff: { type: "exponential", delay: WEB_CRAWL_RETRY_BASE_DELAY_MS },
		};

		const result = await addUniqueJob({
			queue: q,
			jobId,
			jobName: "web-crawl",
			data,
			options: jobOptions,
			logPrefix: "[jobs:web-crawl]",
		});

		if (result.status === "skipped") return result.existingJob.id ?? jobId;
		console.log(
			`[jobs:web-crawl] Enqueued job ${jobId} for doc ${data.docId} (${result.status})`,
		);
		return result.job.id ?? jobId;
	}

	return {
		enqueueWebCrawl,
		close: async (): Promise<void> => {
			if (queue) {
				await queue.close();
				queue = null;
				readyPromise = null;
			}
		},
	};
}

export function createWebCrawlTriggers(config: TriggerConfig) {
	if (config.backend === "cloudflare")
		return createCloudflareWebCrawlTriggers(config);
	return createBullMqWebCrawlTriggers(config);
}
