import { listSessions, runStep, type StepRequest } from "otto-core";
import { getDoc, insertDoc, listChunksForDoc, listDocs } from "otto-db";
import { createWebCrawlTriggers } from "otto-jobs";
import { getBullConnectionOptions } from "otto-redis";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createBunWebSocket } from "hono/bun";
import { handleSocketMessage } from "./ws.js";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new Hono();

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const webCrawlTriggers = createWebCrawlTriggers({
	connection: getBullConnectionOptions(redisUrl),
	redisUrl,
});

// Demo-friendly CORS, same as apps/web's route — a production deployment
// scopes this by tenant API key instead of "*" (see Phase 5).
app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"], allowHeaders: ["content-type"] }));

app.get("/health", (c) => c.json({ status: "healthy" }));

app.get("/sessions", (c) => c.json({ sessions: listSessions(50) }));

app.post("/step", async (c) => {
	let body: StepRequest;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}

	if (!body?.snapshot || typeof body.snapshot.path !== "string" || !Array.isArray(body.snapshot.elements)) {
		return c.json({ error: "missing_snapshot" }, 400);
	}
	if (typeof body.message === "string" && body.message.length > 4000) {
		body.message = body.message.slice(0, 4000);
	}

	const response = await runStep(body, {
		apiKey: process.env.OPENROUTER_API_KEY,
		model: process.env.AGENT_MODEL,
	});
	return c.json(response);
});

// Knowledge base ingestion (Phase 7 — answer path, part 1). No auth/tenant
// scoping yet (Phase 5 is on hold), so this is a flat, unscoped doc list —
// revisit once there's a real multi-tenant model to attach these to.
app.get("/docs", (c) => {
	const docs = listDocs(100);
	return c.json({ docs });
});

app.get("/docs/:id", (c) => {
	const doc = getDoc(c.req.param("id"));
	if (!doc) return c.json({ error: "not_found" }, 404);
	return c.json({ doc, chunks: listChunksForDoc(doc.id) });
});

app.post("/docs", async (c) => {
	let body: { url?: string };
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}

	const url = body.url?.trim();
	if (!url) return c.json({ error: "missing_url" }, 400);
	try {
		new URL(url);
	} catch {
		return c.json({ error: "invalid_url" }, 400);
	}

	const now = Date.now();
	const doc = insertDoc({ id: crypto.randomUUID(), url, status: "pending", createdAt: now, updatedAt: now });
	await webCrawlTriggers.enqueueWebCrawl({ docId: doc.id, url });

	return c.json({ doc }, 201);
});

app.get(
	"/ws",
	upgradeWebSocket(() => ({
		onMessage(event, ws) {
			void handleSocketMessage(String(event.data)).then((reply) => ws.send(reply));
		},
	})),
);

const port = Number(process.env.PORT ?? 8787);
console.log(`[otto-api] listening on :${port}`);

export default {
	port,
	fetch: app.fetch,
	websocket,
};
