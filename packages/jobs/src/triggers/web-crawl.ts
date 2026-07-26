import { getSafeRedisUrl, type RedisOptions } from "otter-redis";
import { type JobsOptions, Queue } from "bullmq";
import { QUEUE_NAMES, type WebCrawlJobData } from "../types.js";
import { addUniqueJob } from "../utils/unique-job.js";

const WEB_CRAWL_RETRY_ATTEMPTS = 3;
const WEB_CRAWL_RETRY_BASE_DELAY_MS = 60 * 1000;

type TriggerConfig = {
	connection: RedisOptions;
	redisUrl: string;
};

export function createWebCrawlTriggers({ connection, redisUrl }: TriggerConfig) {
	const queueName = QUEUE_NAMES.WEB_CRAWL;
	let queue: Queue<WebCrawlJobData> | null = null;
	let readyPromise: Promise<void> | null = null;
	const safeRedisUrl = getSafeRedisUrl(redisUrl);

	function getQueue(): Queue<WebCrawlJobData> {
		if (!queue) {
			console.log(`[jobs:web-crawl] Using queue=${queueName} redis=${safeRedisUrl}`);
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
				() => console.log("[jobs:web-crawl] Queue connection ready for producers"),
				(error) => {
					console.error("[jobs:web-crawl] Failed to initialize queue connection", error);
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
		// hitting "Custom Id cannot contain :". Hyphen instead, matching the
		// separator cossistant itself uses for its job IDs.
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
		console.log(`[jobs:web-crawl] Enqueued job ${jobId} for doc ${data.docId} (${result.status})`);
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
