import { requestEmbedding } from "otter-core";
import {
	replaceChunksForDoc,
	setChunkEmbedding,
	updateDocStatus,
} from "otter-db";
import { type CrawlPage, FirecrawlService } from "./firecrawl.js";
import { chunkMarkdown } from "./text-chunker.js";

export type WebCrawlJobData = {
	docId: string;
	url: string;
};

export type ProcessWebCrawlOptions = {
	firecrawl?: FirecrawlService;
	firecrawlApiKey?: string;
	openRouterApiKey?: string;
	logPrefix?: string;
};

export type WebCrawlProcessResult = {
	docId: string;
	url: string;
	title: string;
	pages: number;
	chunks: number;
	embedded: number;
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

export async function processWebCrawlJob(
	data: WebCrawlJobData,
	options: ProcessWebCrawlOptions = {},
): Promise<WebCrawlProcessResult> {
	const { docId, url } = data;
	const logPrefix = options.logPrefix ?? "[web-crawl]";
	const firecrawl =
		options.firecrawl ?? new FirecrawlService(options.firecrawlApiKey);

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

	let embedded = 0;
	if (options.openRouterApiKey) {
		for (const chunk of insertedChunks) {
			try {
				const embedding = await requestEmbedding(
					chunk.content,
					options.openRouterApiKey,
				);
				await setChunkEmbedding(chunk.id, JSON.stringify(embedding));
				embedded++;
			} catch (error) {
				console.error(`${logPrefix} Failed to embed chunk ${chunk.id}`, error);
			}
		}
		console.log(
			`${logPrefix} Embedded ${embedded}/${insertedChunks.length} chunks for doc ${docId}`,
		);
	} else {
		console.warn(
			`${logPrefix} OPENROUTER_API_KEY not set — doc ${docId} stored but not searchable yet`,
		);
	}

	const title = documentTitle(url, result.title, result.pages.length);
	await updateDocStatus(docId, {
		status: "ready",
		title,
		errorMessage: null,
		updatedAt: Date.now(),
	});
	console.log(
		`${logPrefix} Ingested ${url} -> ${result.pages.length} pages, ${chunkTexts.length} chunks (doc ${docId})`,
	);

	return {
		docId,
		url,
		title,
		pages: result.pages.length,
		chunks: chunkTexts.length,
		embedded,
	};
}
