export const QUEUE_NAMES = {
	WEB_CRAWL: "web-crawl",
} as const;

export type WebCrawlJobData = {
	docId: string;
	url: string;
};
