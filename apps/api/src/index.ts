import { type EngineConfig, listSessions, runStep, type StepRequest } from "otto-core";
import { getDoc, insertDoc, listChunksForDoc, listDocs } from "otto-db";
import { createWebCrawlTriggers } from "otto-jobs";
import { createRedisConnection, getBullConnectionOptions } from "otto-redis";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createBunWebSocket } from "hono/bun";
import { createRedisPauseStore, DEFAULT_PAUSE_MINUTES } from "./safety.js";
import { handleSocketMessage } from "./ws.js";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new Hono();

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const webCrawlTriggers = createWebCrawlTriggers({
	connection: getBullConnectionOptions(redisUrl),
	redisUrl,
});

// Separate direct connection from the BullMQ one above — this one is a
// foreground GET/SET/DEL client for the pause switch, not a job queue
// connection, and safety.ts's fail-open timeout only bounds latency on
// isPaused's own call, not on establishing this connection.
const pauseRedis = createRedisConnection(redisUrl);
const pauseStore = createRedisPauseStore(pauseRedis);

const engineConfig: EngineConfig = {
	apiKey: process.env.OPENROUTER_API_KEY,
	model: process.env.AGENT_MODEL,
	pauseStore,
};

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

	const response = await runStep(body, engineConfig);
	return c.json(response);
});

// Safety (Phase 10) — a server-side backstop the dashboard can call to stop
// an in-progress session immediately, in addition to (not instead of) the
// SDK's own client-side Stop button. No auth yet (Phase 5 is on hold) —
// anyone who knows a sessionId can pause/resume it; acceptable for a demo,
// not for a real deployment.
app.post("/sessions/:id/pause", async (c) => {
	const sessionId = c.req.param("id");
	let body: { durationMinutes?: number } = {};
	try {
		body = await c.req.json();
	} catch {
		// no body is fine, use the default duration
	}
	const durationMs = (body.durationMinutes ?? DEFAULT_PAUSE_MINUTES) * 60_000;
	try {
		await pauseStore.pause(sessionId, durationMs);
	} catch (error) {
		console.error(`[safety] failed to pause session ${sessionId}`, error);
		return c.json({ error: "pause_failed", detail: "Could not reach the pause store" }, 503);
	}
	return c.json({ sessionId, paused: true, durationMinutes: durationMs / 60_000 });
});

app.post("/sessions/:id/resume", async (c) => {
	const sessionId = c.req.param("id");
	try {
		await pauseStore.resume(sessionId);
	} catch (error) {
		console.error(`[safety] failed to resume session ${sessionId}`, error);
		return c.json({ error: "resume_failed", detail: "Could not reach the pause store" }, 503);
	}
	return c.json({ sessionId, paused: false });
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
			void handleSocketMessage(String(event.data), engineConfig).then((reply) => ws.send(reply));
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
