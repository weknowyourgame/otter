import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import {
	type EngineConfig,
	listSessions,
	requestEmbedding,
	runStep,
} from "otter-core";
import {
	acceptTenantInvite,
	countTenantOwners,
	createTenantForUser,
	createTenantInvite,
	type DocRow,
	deleteDoc,
	getAgentByTenant,
	getDoc,
	getSession,
	getTenantById,
	getTenantForUser,
	getTenantInviteByToken,
	getTenantUsageSummary,
	insertDoc,
	listAllowedOrigins,
	listChunksForDoc,
	listDocs,
	listDocsBySourceType,
	listPendingInvites,
	listTenantMembers,
	removeTenantMember,
	replaceAllowedOrigins,
	replaceChunksForDoc,
	revokeTenantInvite,
	setChunkEmbedding,
	updateTenantName,
	upsertAgent,
} from "otter-db";
import { createWebCrawlTriggers } from "otter-jobs";
import { createRedisConnection, getBullConnectionOptions } from "otter-redis";
import { processWebCrawlJob } from "otter-web-crawl";
import {
	createApiKey,
	extractApiKey,
	listTenantApiKeys,
	markApiKeyUsed,
	normalizeOrigin,
	revokeTenantApiKey,
	type ValidatedApiKey,
	validateApiKey,
} from "./api-keys.js";
import { type AuthSession, auth, dashboardOrigins } from "./auth.js";
import { chunkText } from "./chunking.js";
import { sendEmail } from "./email.js";
import { logger } from "./logger.js";
import { createRateLimiter } from "./rate-limit.js";
import { createRedisPauseStore, DEFAULT_PAUSE_MINUTES } from "./safety.js";
import {
	agentConfigBodySchema,
	createApiKeyBodySchema,
	createDocBodySchema,
	createFaqBodySchema,
	createFileBodySchema,
	organizationBodySchema,
	pauseSessionBodySchema,
	replaceOriginsBodySchema,
	stepRequestBodySchema,
	teamInviteBodySchema,
	webCrawlJobBodySchema,
} from "./schemas.js";
import { handleSocketMessage } from "./ws.js";

const { upgradeWebSocket, websocket } = createBunWebSocket();

type DashboardContext = {
	session: AuthSession;
	tenantId: string;
	tenantName: string;
	role: "owner" | "member";
};

type AppEnv = {
	Variables: {
		dashboard: DashboardContext;
		agentAuth: ValidatedApiKey;
		session: AuthSession;
	};
};

const app = new Hono<AppEnv>();

app.onError((error, c) => {
	logger.error(
		{ err: error, method: c.req.method, path: c.req.path },
		"unhandled request error",
	);
	return c.json({ error: "internal_error" }, 500);
});

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const webCrawlTriggers = createWebCrawlTriggers(webCrawlTriggerConfig());
const pauseRedis = createRedisConnection(redisUrl);
const pauseStore = createRedisPauseStore(pauseRedis);
const checkRateLimit = createRateLimiter(pauseRedis);

// Agent-key traffic (widget /step, /ws) is the expensive path — every call
// can trigger an OpenRouter completion. Dashboard traffic is authenticated
// humans clicking around; looser, mostly a backstop against a buggy client
// loop rather than abuse.
const AGENT_KEY_RATE_LIMIT = { limit: 60, windowSeconds: 60 };
const DASHBOARD_RATE_LIMIT = { limit: 300, windowSeconds: 60 };
const REQUIRED_AGENT_MODEL = "openai/gpt-5.3-codex";

function webCrawlTriggerConfig() {
	if (process.env.WEB_CRAWL_BACKEND === "cloudflare") {
		const enqueueUrl = process.env.CLOUDFLARE_WEB_CRAWL_ENQUEUE_URL?.trim();
		const secret = process.env.OTTER_WORKER_SECRET?.trim();
		if (!enqueueUrl || !secret) {
			throw new Error(
				"WEB_CRAWL_BACKEND=cloudflare requires CLOUDFLARE_WEB_CRAWL_ENQUEUE_URL and OTTER_WORKER_SECRET",
			);
		}
		return {
			backend: "cloudflare" as const,
			enqueueUrl,
			secret,
		};
	}

	return {
		backend: "bullmq" as const,
		connection: getBullConnectionOptions(redisUrl),
		redisUrl,
	};
}

function workerSecretFromRequest(c: {
	req: { header(name: string): string | undefined };
}): string | undefined {
	const bearer = c.req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
	return c.req.header("x-otter-worker-secret") ?? bearer;
}

function rateLimitedResponse(retryAfterSeconds: number): Response {
	return Response.json(
		{ error: "rate_limited", retryAfterSeconds },
		{ status: 429, headers: { "retry-after": String(retryAfterSeconds) } },
	);
}

function agentMaxStepsFromEnv(): number {
	const raw = process.env.OTTER_AGENT_MAX_STEPS?.trim();
	if (!raw) return Number.POSITIVE_INFINITY;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0
		? parsed
		: Number.POSITIVE_INFINITY;
}

const baseEngineConfig: EngineConfig = {
	apiKey: process.env.OPENROUTER_API_KEY,
	model: REQUIRED_AGENT_MODEL,
	maxSteps: agentMaxStepsFromEnv(),
	pauseStore,
};

async function engineConfigFor(
	agentAuth: ValidatedApiKey,
): Promise<EngineConfig> {
	const agent = await getAgentByTenant(agentAuth.key.tenantId);
	return {
		...baseEngineConfig,
		tenantId: agentAuth.key.tenantId,
		apiKeyId: agentAuth.key.id,
		model: REQUIRED_AGENT_MODEL,
		systemPromptAddendum: agent?.systemPrompt ?? undefined,
		maxToolCallsPerTurn: agent?.maxToolCalls,
		agentDisabled: agent ? !agent.enabled : false,
	};
}

function defaultTenantName(name: string): string {
	return `${name || "Otter"}'s workspace`;
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
	const dashboardLimit = await checkRateLimit(
		"dashboard",
		session.user.id,
		DASHBOARD_RATE_LIMIT.limit,
		DASHBOARD_RATE_LIMIT.windowSeconds,
	);
	if (!dashboardLimit.allowed) {
		return rateLimitedResponse(dashboardLimit.retryAfterSeconds);
	}
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
		tenantName: access.tenant.name,
		role: access.role,
	});
	await next();
});

/**
 * Session-only, deliberately not requireDashboard: invite acceptance must
 * run before a tenant exists for this user, and requireDashboard's
 * getTenantForUser ?? createTenantForUser would auto-create one first,
 * making every invite look like "user already in tenant".
 */
const requireSession = createMiddleware<AppEnv>(async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) return c.json({ error: "unauthorized" }, 401);
	c.set("session", session);
	await next();
});

const requireAgentKey = createMiddleware<AppEnv>(async (c, next) => {
	const rawKey = extractApiKey(c.req.raw);
	const agentAuth = rawKey ? await validateApiKey(rawKey) : undefined;
	if (!agentAuth) return c.json({ error: "invalid_api_key" }, 401);

	const agentLimit = await checkRateLimit(
		"agent-key",
		agentAuth.key.id,
		AGENT_KEY_RATE_LIMIT.limit,
		AGENT_KEY_RATE_LIMIT.windowSeconds,
	);
	if (!agentLimit.allowed)
		return rateLimitedResponse(agentLimit.retryAfterSeconds);

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
		"access-control-allow-headers": "content-type, x-otter-key",
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
		tenantName: dashboard.tenantName,
		role: dashboard.role,
	});
});

const USAGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

app.get("/api/account/usage", requireDashboard, async (c) => {
	const summary = await getTenantUsageSummary(
		c.get("dashboard").tenantId,
		Date.now() - USAGE_WINDOW_MS,
	);
	return c.json({ usage: summary, windowDays: 30 });
});

app.put("/api/account/organization", requireDashboard, async (c) => {
	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}
	const parsed = organizationBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return c.json({ error: "invalid_body", detail: parsed.error.issues }, 400);
	}
	const dashboard = c.get("dashboard");
	const name = parsed.data.name.trim();
	const tenant = await updateTenantName(
		dashboard.tenantId,
		name,
		defaultTenantSlug(name, dashboard.session.user.id),
	);
	return c.json({ tenantId: tenant.id, tenantName: tenant.name });
});

app.get("/api/account/team", requireDashboard, async (c) => {
	const { tenantId } = c.get("dashboard");
	const [members, invites] = await Promise.all([
		listTenantMembers(tenantId),
		listPendingInvites(tenantId),
	]);
	return c.json({ members, invites });
});

app.post("/api/account/team/invite", requireDashboard, async (c) => {
	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}
	const parsed = teamInviteBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return c.json({ error: "invalid_body", detail: parsed.error.issues }, 400);
	}
	const dashboard = c.get("dashboard");
	const invite = await createTenantInvite({
		tenantId: dashboard.tenantId,
		email: parsed.data.email,
		role: parsed.data.role,
		invitedBy: dashboard.session.user.id,
	});
	const inviteUrl = `${dashboardOrigins()[0]}/invite/${invite.token}`;
	await sendEmail({
		to: invite.email,
		subject: `You've been invited to join ${dashboard.tenantName} on Otter`,
		html: `<p>${dashboard.session.user.name} invited you to join <strong>${dashboard.tenantName}</strong> on Otter.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>This invitation expires in 7 days.</p>`,
	});
	return c.json({ invite }, 201);
});

app.delete("/api/account/team/invite/:id", requireDashboard, async (c) => {
	const ok = await revokeTenantInvite(
		c.req.param("id"),
		c.get("dashboard").tenantId,
	);
	if (!ok) return c.json({ error: "not_found" }, 404);
	return c.body(null, 204);
});

app.delete("/api/account/team/:userId", requireDashboard, async (c) => {
	const dashboard = c.get("dashboard");
	const targetUserId = c.req.param("userId");
	const members = await listTenantMembers(dashboard.tenantId);
	const target = members.find((member) => member.userId === targetUserId);
	if (!target) return c.json({ error: "not_found" }, 404);
	if (target.role === "owner") {
		const owners = await countTenantOwners(dashboard.tenantId);
		if (owners <= 1) {
			return c.json({ error: "cannot_remove_last_owner" }, 400);
		}
	}
	const ok = await removeTenantMember(dashboard.tenantId, targetUserId);
	if (!ok) return c.json({ error: "not_found" }, 404);
	return c.body(null, 204);
});

app.get("/api/invites/:token", async (c) => {
	const invite = await getTenantInviteByToken(c.req.param("token"));
	if (!invite) return c.json({ error: "invite_not_found" }, 404);
	if (invite.acceptedAt) {
		return c.json({ error: "invite_already_accepted" }, 400);
	}
	if (invite.expiresAt < Date.now()) {
		return c.json({ error: "invite_expired" }, 400);
	}
	const tenant = await getTenantById(invite.tenantId);
	return c.json({
		email: invite.email,
		role: invite.role,
		tenantName: tenant?.name ?? "Otter",
	});
});

app.post("/api/invites/:token/accept", requireSession, async (c) => {
	const result = await acceptTenantInvite(
		c.req.param("token"),
		c.get("session").user.id,
	);
	if (!result.ok) return c.json({ error: result.error }, 400);
	return c.json({ tenantId: result.tenantId });
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
	return c.json({
		origins: await listAllowedOrigins(c.get("dashboard").tenantId),
	});
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
		return c.json(
			{ error: "invalid_origins", detail: parsed.error.issues },
			400,
		);
	}
	try {
		const origins = [
			...new Set(parsed.data.origins.map((origin) => normalizeOrigin(origin))),
		];
		return c.json({
			origins: await replaceAllowedOrigins(
				c.get("dashboard").tenantId,
				origins,
			),
		});
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : "invalid_origin" },
			400,
		);
	}
});

const DEFAULT_AGENT_CONFIG = {
	name: "Otter Support",
	model: REQUIRED_AGENT_MODEL,
	systemPrompt: null as string | null,
	maxToolCalls: 6,
	extendedReasoning: true,
	enabled: true,
	tonePreset: "Balanced",
	voiceTone: null as string | null,
	clarificationPolicy: null as string | null,
	escalationPolicy: null as string | null,
	toolSettings: {} as Record<string, boolean>,
};

function parseToolSettings(raw: string | null): Record<string, boolean> {
	if (!raw) return DEFAULT_AGENT_CONFIG.toolSettings;
	try {
		return JSON.parse(raw) as Record<string, boolean>;
	} catch {
		return DEFAULT_AGENT_CONFIG.toolSettings;
	}
}

app.get("/api/account/agent", requireDashboard, async (c) => {
	const agent = await getAgentByTenant(c.get("dashboard").tenantId);
	if (!agent) return c.json({ agent: DEFAULT_AGENT_CONFIG });
	return c.json({
		agent: {
			name: agent.name,
			model: REQUIRED_AGENT_MODEL,
			systemPrompt: agent.systemPrompt,
			maxToolCalls: agent.maxToolCalls,
			extendedReasoning: agent.extendedReasoning,
			enabled: agent.enabled,
			tonePreset: agent.tonePreset,
			voiceTone: agent.voiceTone,
			clarificationPolicy: agent.clarificationPolicy,
			escalationPolicy: agent.escalationPolicy,
			toolSettings: parseToolSettings(agent.toolSettings),
		},
	});
});

app.put("/api/account/agent", requireDashboard, async (c) => {
	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}
	const parsed = agentConfigBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return c.json({ error: "invalid_body", detail: parsed.error.issues }, 400);
	}
	const { tenantId } = c.get("dashboard");
	const existing = await getAgentByTenant(tenantId);
	const now = Date.now();
	const saved = await upsertAgent({
		id: existing?.id ?? crypto.randomUUID(),
		tenantId,
		name: parsed.data.name,
		model: REQUIRED_AGENT_MODEL,
		systemPrompt: parsed.data.systemPrompt,
		maxToolCalls: parsed.data.maxToolCalls,
		extendedReasoning: parsed.data.extendedReasoning,
		enabled: parsed.data.enabled,
		tonePreset: parsed.data.tonePreset,
		voiceTone: parsed.data.voiceTone,
		clarificationPolicy: parsed.data.clarificationPolicy,
		escalationPolicy: parsed.data.escalationPolicy,
		toolSettings: JSON.stringify(parsed.data.toolSettings),
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	});
	return c.json({
		agent: {
			name: saved.name,
			model: REQUIRED_AGENT_MODEL,
			systemPrompt: saved.systemPrompt,
			maxToolCalls: saved.maxToolCalls,
			extendedReasoning: saved.extendedReasoning,
			enabled: saved.enabled,
			tonePreset: saved.tonePreset,
			voiceTone: saved.voiceTone,
			clarificationPolicy: saved.clarificationPolicy,
			escalationPolicy: saved.escalationPolicy,
			toolSettings: parseToolSettings(saved.toolSettings),
		},
	});
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
		return c.json(
			await runStep(parsed.data, await engineConfigFor(c.get("agentAuth"))),
		);
	} catch (error) {
		if (error instanceof Error && error.message === "session_not_found") {
			return c.json({ error: "session_not_found" }, 404);
		}
		throw error;
	}
});

app.get("/sessions", requireDashboard, async (c) => {
	const requestedLimit = Number(c.req.query("limit") ?? 200);
	const limit = Math.max(
		1,
		Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 200, 500),
	);
	return c.json({
		sessions: await listSessions(limit, c.get("dashboard").tenantId),
	});
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
			return c.json(
				{ error: "invalid_body", detail: parsed.error.issues },
				400,
			);
		}
		if (parsed.data.durationMinutes !== undefined)
			durationMinutes = parsed.data.durationMinutes;
	} catch {
		// No body means the default duration.
	}
	const durationMs = Math.max(1, Math.min(1440, durationMinutes)) * 60_000;
	try {
		await pauseStore.pause(sessionRow.id, durationMs);
	} catch (error) {
		logger.error(
			{ err: error, sessionId: sessionRow.id },
			"failed to pause session",
		);
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
		logger.error(
			{ err: error, sessionId: sessionRow.id },
			"failed to resume session",
		);
		return c.json({ error: "resume_failed" }, 503);
	}
	return c.json({ sessionId: sessionRow.id, paused: false });
});

app.post("/internal/web-crawl/process", async (c) => {
	const configuredSecret = process.env.OTTER_WORKER_SECRET?.trim();
	if (!configuredSecret) {
		return c.json({ error: "worker_secret_not_configured" }, 503);
	}
	if (workerSecretFromRequest(c) !== configuredSecret) {
		return c.json({ error: "unauthorized" }, 401);
	}

	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}
	const parsed = webCrawlJobBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return c.json(
			{ error: "invalid_web_crawl_job", detail: parsed.error.issues },
			400,
		);
	}

	const doc = await getDoc(parsed.data.docId);
	if (!doc) return c.json({ error: "not_found" }, 404);
	if (doc.url !== parsed.data.url) {
		return c.json({ error: "url_mismatch" }, 409);
	}

	const result = await processWebCrawlJob(parsed.data, {
		firecrawlApiKey: process.env.FIRECRAWL_API_KEY,
		openRouterApiKey: process.env.OPENROUTER_API_KEY,
		logPrefix: "[api:web-crawl]",
	});
	return c.json({ ok: true, result });
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

app.delete("/docs/:id", requireDashboard, async (c) => {
	const ok = await deleteDoc(c.req.param("id"), c.get("dashboard").tenantId);
	if (!ok) return c.json({ error: "not_found" }, 404);
	return c.body(null, 204);
});

/**
 * Shared by FAQ/file ingestion: both provide their full text content up
 * front (no crawl needed), so chunking + embedding happen inline instead of
 * going through the web-crawl queue. Embeddings are best-effort — same as
 * apps/workers/src/queues/web-crawl/worker.ts — a doc without them still
 * stores its content, just invisible to search until re-ingested with a
 * key configured.
 */
async function ingestSyncDoc(params: {
	tenantId: string;
	url: string;
	title: string;
	sourceType: "faq" | "file";
	content: string | null;
}): Promise<DocRow> {
	const now = Date.now();
	const doc = await insertDoc({
		id: crypto.randomUUID(),
		tenantId: params.tenantId,
		url: params.url,
		title: params.title,
		status: "ready",
		sourceType: params.sourceType,
		createdAt: now,
		updatedAt: now,
	});

	if (!params.content) return doc;

	const chunkTexts = chunkText(params.content);
	const insertedChunks = await replaceChunksForDoc(
		doc.id,
		chunkTexts.map((content, i) => ({
			id: `${doc.id}:${i}`,
			docId: doc.id,
			content,
			embedding: null,
			createdAt: now,
		})),
	);

	const apiKey = process.env.OPENROUTER_API_KEY;
	if (apiKey) {
		for (const chunk of insertedChunks) {
			try {
				const embedding = await requestEmbedding(chunk.content, apiKey);
				await setChunkEmbedding(chunk.id, JSON.stringify(embedding));
			} catch (error) {
				logger.error(
					{ err: error, chunkId: chunk.id },
					"failed to embed chunk",
				);
			}
		}
	}

	return doc;
}

app.get("/faqs", requireDashboard, async (c) => {
	const docs = await listDocsBySourceType("faq", c.get("dashboard").tenantId);
	const faqs = await Promise.all(
		docs.map(async (doc) => {
			const chunks = await listChunksForDoc(doc.id);
			const answer = chunks[0]?.content.split("\nA: ")[1] ?? "";
			return { id: doc.id, question: doc.title ?? "", answer };
		}),
	);
	return c.json({ faqs });
});

app.post("/faqs", requireDashboard, async (c) => {
	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}
	const parsed = createFaqBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return c.json({ error: "invalid_body", detail: parsed.error.issues }, 400);
	}
	const { tenantId } = c.get("dashboard");
	const doc = await ingestSyncDoc({
		tenantId,
		url: `faq://${crypto.randomUUID()}`,
		title: parsed.data.question,
		sourceType: "faq",
		content: `Q: ${parsed.data.question}\nA: ${parsed.data.answer}`,
	});
	return c.json({ doc }, 201);
});

app.delete("/faqs/:id", requireDashboard, async (c) => {
	const ok = await deleteDoc(c.req.param("id"), c.get("dashboard").tenantId);
	if (!ok) return c.json({ error: "not_found" }, 404);
	return c.body(null, 204);
});

app.get("/files", requireDashboard, async (c) => {
	return c.json({
		files: await listDocsBySourceType("file", c.get("dashboard").tenantId),
	});
});

app.post("/files", requireDashboard, async (c) => {
	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json({ error: "invalid_json" }, 400);
	}
	const parsed = createFileBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return c.json({ error: "invalid_body", detail: parsed.error.issues }, 400);
	}
	const { tenantId } = c.get("dashboard");
	const doc = await ingestSyncDoc({
		tenantId,
		url: `file://${parsed.data.name}`,
		title: parsed.data.name,
		sourceType: "file",
		content: parsed.data.content,
	});
	return c.json({ doc }, 201);
});

app.delete("/files/:id", requireDashboard, async (c) => {
	const ok = await deleteDoc(c.req.param("id"), c.get("dashboard").tenantId);
	if (!ok) return c.json({ error: "not_found" }, 404);
	return c.body(null, 204);
});

app.get(
	"/ws",
	upgradeWebSocket(async (c) => {
		const agentAuth = c.get("agentAuth");
		const engineConfig = await engineConfigFor(agentAuth);
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
logger.info({ port }, "otter-api listening");

export default {
	port,
	fetch: app.fetch,
	websocket,
};
