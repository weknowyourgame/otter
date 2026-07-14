// Single-page scrape only — deliberately scoped down from cossistant's
// services/firecrawl.ts, which also does async whole-site crawls (start/poll
// /crawl, /map, pagination, retry-with-cursor). Otto's ingestion model today
// is "add one URL as a knowledge doc," not "crawl an entire site," so only
// the synchronous /scrape endpoint is needed. The retry/timeout plumbing
// below is copied as-is since it's genuinely provider-agnostic HTTP hardening.

const FIRECRAWL_API_BASE = "https://api.firecrawl.dev/v2";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;
const MAX_ERROR_BODY_LENGTH = 500;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export type ScrapeResult =
	| { success: true; title: string | null; markdown: string }
	| { success: false; error: string };

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number): number {
	return RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
}

function isRetryableError(error: unknown): boolean {
	return error instanceof Error && error.name !== "AbortError";
}

export class FirecrawlService {
	private readonly apiKey: string | undefined;

	constructor(apiKey?: string) {
		this.apiKey = apiKey?.trim() || undefined;
		if (!this.apiKey) {
			console.warn("[firecrawl] API key not configured — web-crawl jobs will fail until FIRECRAWL_API_KEY is set.");
		}
	}

	isConfigured(): boolean {
		return Boolean(this.apiKey);
	}

	private async requestWithRetry(path: string, init: RequestInit): Promise<Response> {
		let attempt = 0;
		while (true) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
			try {
				const response = await fetch(`${FIRECRAWL_API_BASE}${path}`, { ...init, signal: controller.signal });
				if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES) {
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

	async scrapeSinglePage(url: string): Promise<ScrapeResult> {
		if (!this.apiKey) return { success: false, error: "Firecrawl API key not configured" };

		try {
			const response = await this.requestWithRetry("/scrape", {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
				body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
			});

			if (!response.ok) {
				const body = (await response.text()).slice(0, MAX_ERROR_BODY_LENGTH);
				return { success: false, error: `Firecrawl API error: ${response.status} ${body || "no body"}` };
			}

			const data = (await response.json()) as {
				success?: boolean;
				error?: string;
				data?: { markdown?: string; metadata?: { title?: string; ogTitle?: string } };
			};

			if (!data.data) {
				return { success: false, error: data.error ?? "Unknown error scraping page" };
			}

			return {
				success: true,
				title: data.data.metadata?.title ?? data.data.metadata?.ogTitle ?? null,
				markdown: data.data.markdown ?? "",
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, error: `Failed to scrape page: ${message}` };
		}
	}
}
