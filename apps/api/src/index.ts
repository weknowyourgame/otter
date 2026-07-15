import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { type EngineConfig, listSessions, runStep } from "otto-core";
import {
	createTenantForUser,
	getDoc,
	getSession,
	getTenantForUser,
	insertDoc,
	listAllowedOrigins,
	listChunksForDoc,
	listDocs,
	replaceAllowedOrigins,
} from "otto-db";
import { createWebCrawlTriggers } from "otto-jobs";
import { createRedisConnection, getBullConnectionOptions } from "otto-redis";
import {
	createApiKey,
	listTenantApiKeys,
	markApiKeyUsed,
	normalizeOrigin,
	revokeTenantApiKey,
	type ValidatedApiKey,
	validateApiKey,
} from "./api-keys.js";
import { type AuthSession, auth, dashboardOrigins } from "./auth.js";
import {
	createApiKeyBodySchema,
	createDocBodySchema,
	pauseSessionBodySchema,
	replaceOriginsBodySchema,
	stepRequestBodySchema,
} from "./schemas.js";
import { createRedisPauseStore, DEFAULT_PAUSE_MINUTES } from "./safety.js";
import { handleSocketMessage } from "./ws.js";

const { upgradeWebSocket, websocket } = createBunWebSocket();

type DashboardContext = {
	session: AuthSession;
	tenantId: string;
	role: "owner" | "member";
};

type AppEnv = {
	Variables: {
		dashboard: DashboardContext;
		agentAuth: ValidatedApiKey;
	};
};

const app = new Hono<AppEnv>();

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const webCrawlTriggers = createWebCrawlTriggers({
	connection: getBullConnectionOptions(redisUrl),
	redisUrl,
});
const pauseRedis = createRedisConnection(redisUrl);
const pauseStore = createRedisPauseStore(pauseRedis);

const baseEngineConfig: EngineConfig = {
	apiKey: process.env.OPENROUTER_API_KEY,
	model: process.env.AGENT_MODEL,
	pauseStore,
};

function engineConfigFor(agentAuth: ValidatedApiKey): EngineConfig {
	return {
		...baseEngineConfig,
		tenantId: agentAuth.key.tenantId,
		apiKeyId: agentAuth.key.id,
	};
}

function defaultTenantName(name: string): string {
	return `${name || "Otto"}'s workspace`;
}

function defaultTenantSlug(name: string, userId: string): string {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 36);
	return `${base || "workspace"}-${userId.slice(0, 8)}`;
}

const requireDashboard = createMiddleware<AppEnv>(async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) return c.json({ error: "unauthorized" }, 401);
	const access =
		(await getTenantForUser(session.user.id)) ??
		(await createTenantForUser({
			userId: session.user.id,
			name: defaultTenantName(session.user.name),
			slug: defaultTenantSlug(session.user.name, session.user.id),
		}));
	c.set("dashboard", {
		session,
		tenantId: access.tenant.id,
		role: access.role,
	});
	await next();
});

function extractApiKey(request: Request): string | undefined {
	const url = new URL(request.url);
	const queryKey = url.searchParams.get("key")?.trim();
	const headerKey = request.headers.get("x-otto-key")?.trim();
	const bearer = request.headers
		.get("authorization")
		?.match(/^Bearer\s+(.+)$/i)?.[1]
		?.trim();
	const keys = [queryKey, headerKey, bearer].filter((key): key is string =>
		Boolean(key),
	);
	if (new Set(keys).size > 1) return undefined;
	return keys[0];
}

const requireAgentKey = createMiddleware<AppEnv>(async (c, next) => {
	const rawKey = extractApiKey(c.req.raw);
	const agentAuth = rawKey ? await validateApiKey(rawKey) : undefined;
	if (!agentAuth) return c.json({ error: "invalid_api_key" }, 401);

	const originHeader = c.req.header("origin");
	let requestOrigin: string | undefined;
	if (originHeader) {
		try {
			requestOrigin = normalizeOrigin(originHeader);
		} catch {
			return c.json({ error: "invalid_origin" }, 403);
		}
		if (!agentAuth.origins.includes(requestOrigin)) {
			return c.json({ error: "origin_not_allowed" }, 403);
		}
	} else if (agentAuth.key.type === "public") {
		return c.json({ error: "public_key_requires_origin" }, 403);
	}

	c.set("agentAuth", agentAuth);
	if (c.req.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: requestOrigin ? agentCorsHeaders(requestOrigin) : undefined,
		});
	}

	await next();
	if (requestOrigin) {
		for (const [name, value] of Object.entries(
			agentCorsHeaders(requestOrigin),
		)) {
			c.header(name, value);
		}
	}
	await markApiKeyUsed(agentAuth.key.id);
});

function agentCorsHeaders(origin: string): Record<string, string> {
	return {
		"access-control-allow-origin": origin,
		"access-control-allow-methods": "POST, OPTIONS",
		"access-control-allow-headers": "content-type, x-otto-key",
		"access-control-max-age": "600",
		vary: "Origin, Access-Control-Request-Headers",
	};
}

const dashboardCors = cors({
	origin: (origin) => (dashboardOrigins().includes(origin) ? origin : ""),
	allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowHeaders: ["content-type"],
	credentials: true,
});

app.use("/api/auth/*", dashboardCors);
app.use("/api/account", dashboardCors);
app.use("/api/account/*", dashboardCors);
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/health", (c) => c.json({ status: "healthy" }));

app.get("/api/account", requireDashboard, (c) => {
	const dashboard = c.get("dashboard");
	return c.json({
		user: dashboard.session.user,
		tenantId: dashboard.tenantId,
		role: dashboard.role,
	});
});

app.get("/api/account/keys", requireDashboard, async (c) => {
	const { tenantId } = c.get("dashboard");
	return c.json({ keys: await listTenantApiKeys(tenantId) });
});

app.post("/api/account/keys", requireDashboard, async (c) => {
	const dashboard = c.get("dashboard");
	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}
	const parsed = createApiKeyBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return c.json({ error: "invalid_body", detail: parsed.error.issues }, 400);
	}
	const created = await createApiKey({
		tenantId: dashboard.tenantId,
		userId: dashboard.session.user.id,
		name: parsed.data.name,
		type: parsed.data.type,
		mode: parsed.data.mode,
	});
	const keys = await listTenantApiKeys(dashboard.tenantId);
	return c.json(
		{
			key: {
				...keys.find((key) => key.id === created.key.id),
				rawKey: created.rawKey,
			},
		},
		201,
	);
});

app.delete("/api/account/keys/:id", requireDashboard, async (c) => {
	const { tenantId } = c.get("dashboard");
	if (!(await revokeTenantApiKey(c.req.param("id"), tenantId))) {
		return c.json({ error: "not_found" }, 404);
	}
	return c.body(null, 204);
});

app.get("/api/account/origins", requireDashboard, async (c) => {
	return c.json({ origins: await listAllowedOrigins(c.get("dashboard").tenantId) });
});

app.put("/api/account/origins", requireDashboard, async (c) => {
	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}
	const parsed = replaceOriginsBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return c.json({ error: "invalid_origins", detail: parsed.error.issues }, 400);
	}
	try {
		const origins = [
			...new Set(parsed.data.origins.map((origin) => normalizeOrigin(origin))),
		];
		return c.json({
			origins: await replaceAllowedOrigins(c.get("dashboard").tenantId, origins),
		});
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : "invalid_origin" },
			400,
		);
	}
});

app.use("/step", requireAgentKey);
app.use("/ws", requireAgentKey);

app.post("/step", async (c) => {
	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}
	// Rejects an over-length message with 400 instead of the old silent
	// truncate-and-continue — a validation layer that quietly mutates input
	// defeats the point of having one.
	const parsed = stepRequestBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return c.json({ error: "invalid_body", detail: parsed.error.issues }, 400);
	}
	try {
		return c.json(await runStep(parsed.data, engineConfigFor(c.get("agentAuth"))));
	} catch (error) {
		if (error instanceof Error && error.message === "session_not_found") {
			return c.json({ error: "session_not_found" }, 404);
		}
		throw error;
	}
});

app.get("/sessions", requireDashboard, async (c) => {
	return c.json({ sessions: await listSessions(50, c.get("dashboard").tenantId) });
});

app.post("/sessions/:id/pause", requireDashboard, async (c) => {
	const dashboard = c.get("dashboard");
	const sessionRow = await getSession(c.req.param("id"));
	if (!sessionRow || sessionRow.tenantId !== dashboard.tenantId) {
		return c.json({ error: "not_found" }, 404);
	}
	let durationMinutes = DEFAULT_PAUSE_MINUTES;
	try {
		const rawBody = await c.req.json();
		const parsed = pauseSessionBodySchema.safeParse(rawBody);
		if (!parsed.success) {
			return c.json({ error: "invalid_body", detail: parsed.error.issues }, 400);
		}
		if (parsed.data.durationMinutes !== undefined) durationMinutes = parsed.data.durationMinutes;
	} catch {
		// No body means the default duration.
	}
	const durationMs = Math.max(1, Math.min(1440, durationMinutes)) * 60_000;
	try {
		await pauseStore.pause(sessionRow.id, durationMs);
	} catch (error) {
		console.error(`[safety] failed to pause session ${sessionRow.id}`, error);
		return c.json({ error: "pause_failed" }, 503);
	}
	return c.json({
		sessionId: sessionRow.id,
		paused: true,
		durationMinutes: durationMs / 60_000,
	});
});

app.post("/sessions/:id/resume", requireDashboard, async (c) => {
	const dashboard = c.get("dashboard");
	const sessionRow = await getSession(c.req.param("id"));
	if (!sessionRow || sessionRow.tenantId !== dashboard.tenantId) {
		return c.json({ error: "not_found" }, 404);
	}
	try {
		await pauseStore.resume(sessionRow.id);
	} catch (error) {
		console.error(`[safety] failed to resume session ${sessionRow.id}`, error);
		return c.json({ error: "resume_failed" }, 503);
	}
	return c.json({ sessionId: sessionRow.id, paused: false });
});

app.get("/docs", requireDashboard, async (c) => {
	return c.json({ docs: await listDocs(100, c.get("dashboard").tenantId) });
});

app.get("/docs/:id", requireDashboard, async (c) => {
	const doc = await getDoc(c.req.param("id"), c.get("dashboard").tenantId);
	if (!doc) return c.json({ error: "not_found" }, 404);
	return c.json({ doc, chunks: await listChunksForDoc(doc.id) });
});

app.post("/docs", requireDashboard, async (c) => {
	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}
	const parsed = createDocBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return c.json({ error: "invalid_url", detail: parsed.error.issues }, 400);
	}
	const url = parsed.data.url;
	const now = Date.now();
	const doc = await insertDoc({
		id: crypto.randomUUID(),
		tenantId: c.get("dashboard").tenantId,
		url,
		status: "pending",
		createdAt: now,
		updatedAt: now,
	});
	await webCrawlTriggers.enqueueWebCrawl({ docId: doc.id, url });
	return c.json({ doc }, 201);
});

app.get(
	"/ws",
	upgradeWebSocket((c) => {
		const agentAuth = c.get("agentAuth");
		const engineConfig = engineConfigFor(agentAuth);
		return {
			onMessage(event, ws) {
				void handleSocketMessage(String(event.data), engineConfig).then(
					(reply) => ws.send(reply),
				);
			},
		};
	}),
);

const port = Number(process.env.PORT ?? 8787);
console.log(`[otto-api] listening on :${port}`);

export default {
	port,
	fetch: app.fetch,
	websocket,
};
