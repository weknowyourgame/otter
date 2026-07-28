type WebCrawlJobData = {
	docId: string;
	url: string;
};

type QueueBinding<T> = {
	send(message: T): Promise<void>;
};

type QueueMessage<T> = {
	readonly body: T;
	readonly attempts: number;
	ack(): void;
	retry(options?: { delaySeconds?: number }): void;
};

type MessageBatch<T> = {
	readonly queue: string;
	readonly messages: QueueMessage<T>[];
};

type Env = {
	WEB_CRAWL_QUEUE: QueueBinding<WebCrawlJobData>;
	OTTER_API_URL: string;
	OTTER_WORKER_SECRET: string;
};

function json(body: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body), {
		...init,
		headers: {
			"content-type": "application/json",
			...(init?.headers ?? {}),
		},
	});
}

function normalizeApiUrl(value: string): string {
	return value.trim().replace(/\/$/, "");
}

function requestSecret(request: Request): string | null {
	const bearer = request.headers
		.get("authorization")
		?.match(/^Bearer\s+(.+)$/i)?.[1];
	return request.headers.get("x-otter-worker-secret") ?? bearer ?? null;
}

function validJob(value: unknown): value is WebCrawlJobData {
	if (!value || typeof value !== "object") return false;
	const job = value as WebCrawlJobData;
	if (typeof job.docId !== "string" || !job.docId.trim()) return false;
	if (typeof job.url !== "string") return false;
	try {
		new URL(job.url);
		return true;
	} catch {
		return false;
	}
}

async function enqueue(request: Request, env: Env): Promise<Response> {
	if (!env.OTTER_WORKER_SECRET) {
		return json({ error: "worker_secret_not_configured" }, { status: 503 });
	}
	if (requestSecret(request) !== env.OTTER_WORKER_SECRET) {
		return json({ error: "unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "invalid_json" }, { status: 400 });
	}
	if (!validJob(body)) {
		return json({ error: "invalid_web_crawl_job" }, { status: 400 });
	}

	await env.WEB_CRAWL_QUEUE.send({
		docId: body.docId.trim(),
		url: body.url.trim(),
	});
	return json(
		{ ok: true, jobId: `web-crawl-${body.docId.trim()}` },
		{ status: 202 },
	);
}

async function processQueuedJob(job: WebCrawlJobData, env: Env): Promise<void> {
	const response = await fetch(
		`${normalizeApiUrl(env.OTTER_API_URL)}/internal/web-crawl/process`,
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-otter-worker-secret": env.OTTER_WORKER_SECRET,
			},
			body: JSON.stringify(job),
		},
	);
	if (!response.ok) {
		const detail = await response.text();
		throw new Error(
			`API process failed: ${response.status} ${detail || "no body"}`,
		);
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === "/health") return json({ status: "healthy" });
		if (url.pathname === "/enqueue" && request.method === "POST") {
			return enqueue(request, env);
		}
		if (url.pathname === "/enqueue" && request.method === "OPTIONS") {
			return new Response(null, { status: 204 });
		}
		return json({ error: "not_found" }, { status: 404 });
	},

	async queue(batch: MessageBatch<WebCrawlJobData>, env: Env): Promise<void> {
		for (const message of batch.messages) {
			try {
				if (!validJob(message.body)) throw new Error("invalid_web_crawl_job");
				await processQueuedJob(message.body, env);
				message.ack();
			} catch (error) {
				console.error("[cf:web-crawl] job failed", {
					attempts: message.attempts,
					error: error instanceof Error ? error.message : String(error),
				});
				message.retry({
					delaySeconds: Math.min(300, 30 * (message.attempts + 1)),
				});
			}
		}
	},
};
