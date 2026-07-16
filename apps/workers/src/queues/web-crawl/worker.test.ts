import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ScrapeResult } from "../../services/firecrawl.js";
import { FirecrawlService } from "../../services/firecrawl.js";

type DocStatusUpdate = {
	docId: string;
	status: string;
	errorMessage?: string | null;
};

const statusUpdates: DocStatusUpdate[] = [];

mock.module("otto-db", () => ({
	updateDocStatus: async (
		docId: string,
		patch: { status: string; errorMessage?: string | null },
	) => {
		statusUpdates.push({
			docId,
			status: patch.status,
			errorMessage: patch.errorMessage,
		});
	},
	replaceChunksForDoc: async (
		docId: string,
		rows: Array<{ id: string; content: string }>,
	) =>
		rows.map((row) => ({
			...row,
			docId,
			embedding: null,
			createdAt: Date.now(),
		})),
	setChunkEmbedding: async () => {},
}));

mock.module("otto-core", () => ({
	requestEmbedding: async () => {
		throw new Error(
			"embeddings should not be requested without an OpenRouter key",
		);
	},
}));

const { processWebCrawlJob } = await import("./worker.js");

/** A FirecrawlService stand-in whose scrapeSinglePage result is controlled per test. */
function fakeFirecrawl(result: ScrapeResult): FirecrawlService {
	const service = {
		isConfigured: () => true,
		scrapeSinglePage: async () => result,
	};
	return service as unknown as FirecrawlService;
}

beforeEach(() => {
	statusUpdates.length = 0;
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

	it("marks the doc failed and throws when the scrape itself fails", async () => {
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

	it("still marks the doc ready when the scrape succeeds without an OpenRouter key (unembedded, not unsearchable-and-broken)", async () => {
		const succeeding = fakeFirecrawl({
			success: true,
			title: "Example Page",
			markdown: "# Hello\n\nSome content here.",
		});

		await processWebCrawlJob(succeeding, undefined, {
			docId: "doc-3",
			url: "https://example.com",
		});

		const finalUpdate = statusUpdates
			.filter((update) => update.docId === "doc-3")
			.at(-1);
		expect(finalUpdate?.status).toBe("ready");
	});
});
