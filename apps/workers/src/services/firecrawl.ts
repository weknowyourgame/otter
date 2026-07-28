const FIRECRAWL_API_BASE = "https://api.firecrawl.dev/v2";
const REQUEST_TIMEOUT_MS = 30_000;
const CRAWL_STATUS_TIMEOUT_MS = 10 * 60_000;
const CRAWL_STATUS_INTERVAL_MS = 2500;
const DEFAULT_CRAWL_LIMIT = 50;
const DEFAULT_MAX_CONCURRENCY = 2;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;
const MAX_ERROR_BODY_LENGTH = 500;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export type CrawlPage = {
	url: string;
	title: string | null;
	markdown: string;
};

export type CrawlResult =
	| {
			success: true;
			title: string | null;
			pages: CrawlPage[];
			total?: number;
			completed?: number;
	  }
	| { success: false; error: string };

type CrawlStatus = {
	status?: "scraping" | "completed" | "failed" | "cancelled" | string;
	total?: number;
	completed?: number;
	next?: string | null;
	data?: FirecrawlPage[];
	error?: string;
};

type FirecrawlPage = {
	markdown?: string;
	metadata?: {
		title?: string;
		ogTitle?: string;
		sourceURL?: string;
		url?: string;
		error?: string;
		statusCode?: number;
	};
};

type FirecrawlServiceOptions = {
	crawlLimit?: number;
	maxConcurrency?: number;
	statusTimeoutMs?: number;
	statusIntervalMs?: number;
	allowSubdomains?: boolean;
};

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number): number {
	return RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
}

function isRetryableError(error: unknown): boolean {
	return error instanceof Error && error.name !== "AbortError";
}

function envNumber(name: string, fallback: number): number {
	const value = Number.parseInt(process.env[name] ?? "", 10);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

function pageUrl(page: FirecrawlPage): string | undefined {
	return page.metadata?.sourceURL ?? page.metadata?.url;
}

function pageTitle(page: FirecrawlPage): string | null {
	return page.metadata?.title ?? page.metadata?.ogTitle ?? null;
}

export class FirecrawlService {
	private readonly apiKey: string | undefined;
	private readonly crawlLimit: number;
	private readonly maxConcurrency: number;
	private readonly statusTimeoutMs: number;
	private readonly statusIntervalMs: number;
	private readonly allowSubdomains: boolean;

	constructor(apiKey?: string, options: FirecrawlServiceOptions = {}) {
		this.apiKey = apiKey?.trim() || undefined;
		this.crawlLimit =
			options.crawlLimit ??
			envNumber("FIRECRAWL_CRAWL_LIMIT", DEFAULT_CRAWL_LIMIT);
		this.maxConcurrency =
			options.maxConcurrency ??
			envNumber("FIRECRAWL_MAX_CONCURRENCY", DEFAULT_MAX_CONCURRENCY);
		this.statusTimeoutMs = options.statusTimeoutMs ?? CRAWL_STATUS_TIMEOUT_MS;
		this.statusIntervalMs =
			options.statusIntervalMs ?? CRAWL_STATUS_INTERVAL_MS;
		this.allowSubdomains =
			options.allowSubdomains ?? process.env.FIRECRAWL_ALLOW_SUBDOMAINS === "1";
		if (!this.apiKey) {
			console.warn(
				"[firecrawl] API key not configured — web-crawl jobs will fail until FIRECRAWL_API_KEY is set.",
			);
		}
	}

	isConfigured(): boolean {
		return Boolean(this.apiKey);
	}

	private async requestWithRetry(
		target: string,
		init: RequestInit,
	): Promise<Response> {
		let attempt = 0;
		const url = target.startsWith("http")
			? target
			: `${FIRECRAWL_API_BASE}${target}`;

		while (true) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
			try {
				const response = await fetch(url, {
					...init,
					signal: controller.signal,
				});
				if (
					RETRYABLE_STATUS_CODES.has(response.status) &&
					attempt < MAX_RETRIES
				) {
					attempt++;
					await sleep(retryDelayMs(attempt));
					continue;
				}
				return response;
			} catch (error) {
				if (attempt < MAX_RETRIES && isRetryableError(error)) {
					attempt++;
					await sleep(retryDelayMs(attempt));
					continue;
				}
				throw error;
			} finally {
				clearTimeout(timeout);
			}
		}
	}

	private async requestJson<T>(target: string, init: RequestInit): Promise<T> {
		const headers = new Headers(init.headers);
		headers.set("Authorization", `Bearer ${this.apiKey}`);
		headers.set("Content-Type", "application/json");

		const response = await this.requestWithRetry(target, {
			...init,
			headers,
		});

		if (!response.ok) {
			const body = (await response.text()).slice(0, MAX_ERROR_BODY_LENGTH);
			throw new Error(
				`Firecrawl API error: ${response.status} ${body || "no body"}`,
			);
		}

		return (await response.json()) as T;
	}

	private async startCrawl(url: string): Promise<string> {
		const body = await this.requestJson<{
			success?: boolean;
			id?: string;
			error?: string;
		}>("/crawl", {
			method: "POST",
			body: JSON.stringify({
				url,
				limit: this.crawlLimit,
				crawlEntireDomain: true,
				allowExternalLinks: false,
				allowSubdomains: this.allowSubdomains,
				ignoreQueryParameters: true,
				maxConcurrency: this.maxConcurrency,
				sitemap: "include",
				scrapeOptions: {
					formats: ["markdown"],
					onlyMainContent: true,
					removeBase64Images: true,
					blockAds: true,
					timeout: 60_000,
				},
			}),
		});

		if (!body.success || !body.id) {
			throw new Error(body.error ?? "Firecrawl crawl did not return a job id");
		}
		return body.id;
	}

	private async getCrawlStatus(target: string): Promise<CrawlStatus> {
		return this.requestJson<CrawlStatus>(target, { method: "GET" });
	}

	private async waitForCrawl(id: string): Promise<CrawlStatus> {
		const deadline = Date.now() + this.statusTimeoutMs;
		while (Date.now() < deadline) {
			const status = await this.getCrawlStatus(`/crawl/${id}`);
			if (status.status === "completed") return status;
			if (status.status === "failed" || status.status === "cancelled") {
				throw new Error(
					status.error ?? `Firecrawl crawl ${status.status ?? "failed"}`,
				);
			}
			await sleep(this.statusIntervalMs);
		}
		throw new Error("Firecrawl crawl timed out before completion");
	}

	private async collectPages(
		firstStatus: CrawlStatus,
	): Promise<FirecrawlPage[]> {
		const pages = [...(firstStatus.data ?? [])];
		let next = firstStatus.next ?? null;
		while (next) {
			const status = await this.getCrawlStatus(next);
			pages.push(...(status.data ?? []));
			next = status.next ?? null;
		}
		return pages;
	}

	async crawlWebsite(url: string): Promise<CrawlResult> {
		if (!this.apiKey) {
			return { success: false, error: "Firecrawl API key not configured" };
		}

		try {
			const crawlId = await this.startCrawl(url);
			const status = await this.waitForCrawl(crawlId);
			const rawPages = await this.collectPages(status);
			const pages = rawPages
				.map((page) => ({
					url: pageUrl(page) ?? url,
					title: pageTitle(page),
					markdown: page.markdown?.trim() ?? "",
				}))
				.filter((page) => page.markdown.length > 0);

			if (pages.length === 0) {
				return {
					success: false,
					error: "Firecrawl returned no crawlable pages",
				};
			}

			return {
				success: true,
				title: pages[0]?.title ?? new URL(url).hostname,
				pages,
				total: status.total,
				completed: status.completed,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, error: `Failed to crawl website: ${message}` };
		}
	}
}
