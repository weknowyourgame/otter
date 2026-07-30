import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { FirecrawlService, type CrawlResult } from "otter-web-crawl";

type DocStatusUpdate = {
	docId: string;
	status: string;
	title?: string | null;
	errorMessage?: string | null;
};

const statusUpdates: DocStatusUpdate[] = [];
const storedChunks: Array<{
	docId: string;
	rows: Array<{ id: string; content: string }>;
}> = [];
const originalFetch = globalThis.fetch;

mock.module("otter-db", () => ({
	updateDocStatus: async (
		docId: string,
		patch: {
			status: string;
			title?: string | null;
			errorMessage?: string | null;
		},
	) => {
		statusUpdates.push({
			docId,
			status: patch.status,
			title: patch.title,
			errorMessage: patch.errorMessage,
		});
	},
	replaceChunksForDoc: async (
		docId: string,
		rows: Array<{ id: string; content: string }>,
	) => {
		storedChunks.push({ docId, rows });
		return rows.map((row) => ({
			...row,
			docId,
			embedding: null,
			createdAt: Date.now(),
		}));
	},
	setChunkEmbedding: async () => {},
}));

mock.module("otter-core", () => ({
	requestEmbedding: async () => {
		throw new Error(
			"embeddings should not be requested without an OpenRouter key",
		);
	},
}));

const { processWebCrawlJob } = await import("./worker.js");

/** A FirecrawlService stand-in whose crawlWebsite result is controlled per test. */
function fakeFirecrawl(result: CrawlResult): FirecrawlService {
	const service = {
		isConfigured: () => true,
		crawlWebsite: async () => result,
	};
	return service as unknown as FirecrawlService;
}

beforeEach(() => {
	statusUpdates.length = 0;
	storedChunks.length = 0;
	globalThis.fetch = originalFetch;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("FirecrawlService — crawl options", () => {
	it("includes subdomains by default while keeping external links disabled", async () => {
		const originalAllowSubdomains = process.env.FIRECRAWL_ALLOW_SUBDOMAINS;
		const originalAllowExternalLinks =
			process.env.FIRECRAWL_ALLOW_EXTERNAL_LINKS;
		process.env.FIRECRAWL_ALLOW_SUBDOMAINS = "";
		process.env.FIRECRAWL_ALLOW_EXTERNAL_LINKS = "";

		let crawlBody: Record<string, unknown> | undefined;
		globalThis.fetch = mock(async (input, init) => {
			const url = String(input);
			if (url.endsWith("/crawl")) {
				crawlBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
				return new Response(JSON.stringify({ success: true, id: "crawl-1" }));
			}
			if (url.endsWith("/crawl/crawl-1")) {
				return new Response(
					JSON.stringify({
						status: "completed",
						data: [
							{
								markdown: "Welcome to Cordant.",
								metadata: {
									title: "Cordant",
									sourceURL: "https://cordant.dev",
								},
							},
						],
					}),
				);
			}
			return new Response("not found", { status: 404 });
		}) as unknown as typeof fetch;

		try {
			const result = await new FirecrawlService("fc-test", {
				crawlLimit: 3,
				maxConcurrency: 1,
				statusIntervalMs: 1,
				statusTimeoutMs: 50,
			}).crawlWebsite("https://cordant.dev");

			expect(result.success).toBe(true);
			expect(crawlBody).toEqual(
				expect.objectContaining({
					url: "https://cordant.dev",
					limit: 3,
					crawlEntireDomain: true,
					allowSubdomains: true,
					allowExternalLinks: false,
					sitemap: "include",
				}),
			);
		} finally {
			if (originalAllowSubdomains === undefined) {
				delete process.env.FIRECRAWL_ALLOW_SUBDOMAINS;
			} else {
				process.env.FIRECRAWL_ALLOW_SUBDOMAINS = originalAllowSubdomains;
			}
			if (originalAllowExternalLinks === undefined) {
				delete process.env.FIRECRAWL_ALLOW_EXTERNAL_LINKS;
			} else {
				process.env.FIRECRAWL_ALLOW_EXTERNAL_LINKS = originalAllowExternalLinks;
			}
		}
	});
});

describe("processWebCrawlJob — failure paths", () => {
	it("marks the doc failed and throws when Firecrawl isn't configured", async () => {
		const unconfigured = new FirecrawlService(undefined);

		await expect(
			processWebCrawlJob(unconfigured, undefined, {
				docId: "doc-1",
				url: "https://example.com",
			}),
		).rejects.toThrow("Firecrawl API is not configured");

		expect(statusUpdates).toContainEqual(
			expect.objectContaining({
				docId: "doc-1",
				status: "failed",
				errorMessage: "Firecrawl API is not configured",
			}),
		);
	});

	it("marks the doc failed and throws when the crawl itself fails", async () => {
		const failing = fakeFirecrawl({
			success: false,
			error: "Firecrawl API error: 500 upstream timeout",
		});

		await expect(
			processWebCrawlJob(failing, undefined, {
				docId: "doc-2",
				url: "https://example.com",
			}),
		).rejects.toThrow("Firecrawl API error: 500 upstream timeout");

		// updateDocStatus is called twice for this doc ("crawling", then
		// "failed") — the final call is the one that matters here.
		const finalUpdate = statusUpdates
			.filter((update) => update.docId === "doc-2")
			.at(-1);
		expect(finalUpdate?.status).toBe("failed");
		expect(finalUpdate?.errorMessage).toContain("upstream timeout");
	});

	it("still marks the doc ready when the crawl succeeds without an OpenRouter key (unembedded, not unsearchable-and-broken)", async () => {
		const succeeding = fakeFirecrawl({
			success: true,
			title: "Example Site",
			pages: [
				{
					url: "https://example.com/docs",
					title: "Docs",
					markdown: "# Hello\n\nSome content here.",
				},
				{
					url: "https://example.com/pricing",
					title: "Pricing",
					markdown: "Billing works monthly or annually.",
				},
			],
		});

		await processWebCrawlJob(succeeding, undefined, {
			docId: "doc-3",
			url: "https://example.com",
		});

		const finalUpdate = statusUpdates
			.filter((update) => update.docId === "doc-3")
			.at(-1);
		expect(finalUpdate?.status).toBe("ready");
		expect(finalUpdate?.title).toBe("Example Site (2 pages)");
		expect(storedChunks[0]?.rows).toHaveLength(2);
		expect(storedChunks[0]?.rows[0]?.content).toContain(
			"Source: https://example.com/docs",
		);
		expect(storedChunks[0]?.rows[1]?.content).toContain(
			"Source: https://example.com/pricing",
		);
	});
});
