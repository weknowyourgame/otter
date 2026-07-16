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

// Bare liveness check — no BullMQ queue introspection, just "is the process
// up and did the worker start." Same shape as apps/api's GET /health so
// both services can be monitored the same way.
const healthPort = Number(process.env.WORKERS_HEALTH_PORT ?? 8788);
const healthServer = Bun.serve({
	port: healthPort,
	fetch(request) {
		const url = new URL(request.url);
		if (url.pathname === "/health") {
			return Response.json({ status: "healthy" });
		}
		return new Response("Not found", { status: 404 });
	},
});
console.log(`[otto-workers] health check on :${healthPort}`);

async function shutdown() {
	console.log("[otto-workers] shutting down");
	await webCrawlWorker.stop();
	healthServer.stop();
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
