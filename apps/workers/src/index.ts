import { getBullConnectionOptions } from "otto-redis";
import { createWebCrawlWorker } from "./queues/web-crawl/worker.js";

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const connection = getBullConnectionOptions(redisUrl);

const webCrawlWorker = createWebCrawlWorker({
	connection,
	firecrawlApiKey: process.env.FIRECRAWL_API_KEY,
	openRouterApiKey: process.env.OPENROUTER_API_KEY,
});

await webCrawlWorker.start();
console.log("[otto-workers] started");

async function shutdown() {
	console.log("[otto-workers] shutting down");
	await webCrawlWorker.stop();
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
