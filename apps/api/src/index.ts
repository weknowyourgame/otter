import { listSessions, runStep, type StepRequest } from "otto-core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createBunWebSocket } from "hono/bun";
import { handleSocketMessage } from "./ws.js";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new Hono();

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
