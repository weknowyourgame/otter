// HTTP app for the guidance backend. Routes:
//
//   POST /api/ai-proxy                        chat widget's LLM matching (CORS)
//   POST /api/connectors/jira/automation      Jira Automation "Send web request"
//   GET  /api/guidance/handoffs/:token        SDK exchanges token for a plan (CORS)
//   POST /api/guidance/handoffs/:token/complete  SDK audit callback (CORS)
//   GET  /ai-widget-sdk.js                    the built SDK bundle
//   GET  / or /bookmarklet                    bookmarklet install page
//
// Exported as startServer() so server.js (the CLI entry) and tests share the
// exact same wiring — tests pass port 0 and their own env.

import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleAIProposal } from "ai-proxy-core";
import { INTENT_REGISTRY, resolveIntent, resolveIntentWithLLM } from "./intents.js";
import {
	completeHandoff,
	consumePendingDelivery,
	createHandoff,
	createPendingDelivery,
	getHandoffPlan,
} from "./handoffs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NO_MATCH_REPLY =
	"I could not find a guided action for that yet. A support agent can still help here.";

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

function sendJson(res, statusCode, body) {
	res.statusCode = statusCode;
	res.setHeader("content-type", "application/json; charset=utf-8");
	res.end(JSON.stringify(body));
}

function setCors(res) {
	res.setHeader("access-control-allow-origin", "*");
	res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
	res.setHeader("access-control-allow-headers", "content-type");
}

async function readJsonBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	if (!chunks.length) return {};
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

// Constant-time-ish secret comparison; length leak is acceptable for a demo.
function secretMatches(provided, expected) {
	if (typeof provided !== "string" || !expected) return false;
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return crypto.timingSafeEqual(a, b);
}

// Minimal in-memory rate limit for the webhook: N requests per IP per minute.
const RATE_LIMIT_PER_MINUTE = 30;
const rateBuckets = new Map();
function rateLimited(ip, now = Date.now()) {
	const bucket = rateBuckets.get(ip);
	if (!bucket || now - bucket.windowStart >= 60_000) {
		rateBuckets.set(ip, { windowStart: now, count: 1 });
		return false;
	}
	bucket.count += 1;
	return bucket.count > RATE_LIMIT_PER_MINUTE;
}

// The email-keyed pending endpoint is public in this demo, so keep its
// in-memory abuse limit independent of the automation webhook's limit.
const PENDING_RATE_LIMIT_PER_MINUTE = 60;
const pendingRateBuckets = new Map();
function pendingRateLimited(ip, now = Date.now()) {
	const bucket = pendingRateBuckets.get(ip);
	if (!bucket || now - bucket.windowStart >= 60_000) {
		pendingRateBuckets.set(ip, { windowStart: now, count: 1 });
		return false;
	}
	bucket.count += 1;
	return bucket.count > PENDING_RATE_LIMIT_PER_MINUTE;
}

// ---------------------------------------------------------------------
// Jira Automation webhook
// ---------------------------------------------------------------------

async function handleJiraAutomation(req, res, env) {
	if (req.method !== "POST") {
		res.setHeader("allow", "POST");
		return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
	}

	const expectedSecret = env.JIRA_AUTOMATION_SECRET;
	if (!expectedSecret) {
		return sendJson(res, 503, { ok: false, error: "webhook_not_configured" });
	}
	if (!secretMatches(req.headers["x-guidance-demo-secret"], expectedSecret)) {
		return sendJson(res, 401, { ok: false, error: "invalid_secret" });
	}
	if (rateLimited(req.socket.remoteAddress || "unknown")) {
		return sendJson(res, 429, { ok: false, error: "rate_limited" });
	}

	let payload;
	try {
		payload = await readJsonBody(req);
	} catch {
		return sendJson(res, 400, { ok: false, error: "invalid_json" });
	}

	// Don't trust the Jira payload: coerce to strings, cap lengths.
	const summary = typeof payload.summary === "string" ? payload.summary.slice(0, 500) : "";
	const description =
		typeof payload.description === "string" ? payload.description.slice(0, 2000) : "";
	const issueKey = typeof payload.issueKey === "string" ? payload.issueKey.slice(0, 50) : null;
	const tenantId = typeof payload.tenantId === "string" ? payload.tenantId.slice(0, 50) : "demo";
	const source = typeof payload.source === "string" ? payload.source.slice(0, 50) : null;
	const reporterEmail = typeof payload.reporterEmail === "string" ? payload.reporterEmail.slice(0, 320) : "";
	const message = `${summary}\n${description}`.trim();

	if (!message) {
		return sendJson(res, 200, { ok: true, replyMarkdown: NO_MATCH_REPLY, intent: null });
	}

	// Deterministic registry first; LLM fallback only when that misses.
	let entry = resolveIntent(message);
	let resolvedBy = "registry";
	if (!entry) {
		entry = await resolveIntentWithLLM(message, env.OPENROUTER_API_KEY);
		resolvedBy = entry ? "llm" : "none";
	}

	if (!entry) {
		console.log(
			`[jira-webhook] no intent for ${issueKey ?? "(no key)"}: ${JSON.stringify(summary.slice(0, 120))}`,
		);
		return sendJson(res, 200, { ok: true, replyMarkdown: NO_MATCH_REPLY, intent: null });
	}

	const { token, record } = createHandoff(entry, { tenantId, issueKey, source });
	// This is deliberately best-effort: the Jira comment fallback is always
	// returned even when no reporter email is present in an Automation payload.
	createPendingDelivery(reporterEmail, {
		token,
		intent: entry.intent,
		replyPreview: `Support found ${entry.targetLabel || entry.intent.replace(/_/g, " ")}.`,
	});
	const demoAppUrl = (env.DEMO_APP_URL || "http://localhost:3000").replace(/\/$/, "");
	const handoffUrl = `${demoAppUrl}${entry.route}?guide_handoff=${token}`;

	console.log(
		`[jira-webhook] ${issueKey ?? "(no key)"} -> ${entry.intent} (via ${resolvedBy})`,
	);

	// replyMarkdown is built ONLY from registry text + our own URL — no Jira
	// payload fields are echoed back, so nothing user-controlled reaches the
	// public comment.
	return sendJson(res, 200, {
		ok: true,
		replyMarkdown: `${entry.reply} ${handoffUrl}`,
		handoffUrl,
		intent: entry.intent,
		expiresAt: new Date(record.expiresAtMs).toISOString(),
	});
}

// ---------------------------------------------------------------------
// guidance handoff endpoints (called by the SDK from the browser)
// ---------------------------------------------------------------------

function handleHandoffFetch(res, token) {
	const plan = getHandoffPlan(token);
	if (!plan) {
		return sendJson(res, 404, { ok: false, error: "unknown_or_expired" });
	}
	return sendJson(res, 200, { ok: true, plan });
}

function handlePendingHandoff(req, res, url) {
	if (req.method !== "GET") {
		return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
	}
	if (pendingRateLimited(req.socket.remoteAddress || "unknown")) {
		return sendJson(res, 429, { ok: false, error: "rate_limited" });
	}
	return sendJson(res, 200, {
		ok: true,
		handoff: consumePendingDelivery(url.searchParams.get("email")),
	});
}

async function handleHandoffComplete(req, res, token) {
	let payload;
	try {
		payload = await readJsonBody(req);
	} catch {
		return sendJson(res, 400, { ok: false, error: "invalid_json" });
	}
	const result = completeHandoff(token, payload);
	return sendJson(res, result.ok ? 200 : 400, result);
}

// ---------------------------------------------------------------------
// widget bundle + bookmarklet page
// ---------------------------------------------------------------------

const WIDGET_DIST_PATH = path.join(__dirname, "..", "..", "sdk", "dist", "ai-widget-sdk.global.js");

function loadWidgetBundle() {
	try {
		return fs.readFileSync(WIDGET_DIST_PATH, "utf8");
	} catch {
		console.error(
			`Could not find ${WIDGET_DIST_PATH} — run "npm run build" in packages/sdk first.`,
		);
		process.exit(1);
	}
}

function bookmarkletPage(origin) {
	const proxyUrl = `${origin}/api/ai-proxy`;
	const widgetUrl = `${origin}/ai-widget-sdk.js`;
	const code =
		"javascript:(function(){" +
		"if(document.getElementById('ai-widget-sdk-host')){alert('AI widget already active on this page.');return;}" +
		"var s=document.createElement('script');" +
		`s.src=${JSON.stringify(widgetUrl)};` +
		`s.setAttribute('data-ai-proxy-url',${JSON.stringify(proxyUrl)});` +
		"document.body.appendChild(s);" +
		"})();";

	return `<!doctype html>
<html><head><meta charset="utf-8"><title>AI Widget — Bookmarklet</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 640px; margin: 60px auto; padding: 0 20px; line-height: 1.5; }
  a.bookmarklet { display: inline-block; padding: 10px 18px; background: #111; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; }
  ol { padding-left: 20px; }
</style></head>
<body>
  <h1>AI Support Widget — standalone</h1>
  <p>Drag this link to your bookmarks bar:</p>
  <p><a class="bookmarklet" href="${code.replace(/"/g, "&quot;")}">Inject AI Widget</a></p>
  <ol>
    <li>Keep this server running (<code>npm start</code>).</li>
    <li>Open any website in your browser.</li>
    <li>Click the bookmarklet. The widget appears bottom-right.</li>
  </ol>
  <p>Real AI matching (via OpenRouter, free Nemotron model) requires <code>OPENROUTER_API_KEY</code> in <code>.env</code> here.
     Without it, the widget still works using its local keyword matcher.</p>
</body></html>`;
}

// ---------------------------------------------------------------------
// server
// ---------------------------------------------------------------------

const HANDOFF_ROUTE_RE = /^\/api\/guidance\/handoffs\/([A-Za-z0-9_-]+)(\/complete)?$/;

export function createApp({ env = process.env } = {}) {
	const widgetJs = loadWidgetBundle();

	return http.createServer(async (req, res) => {
		const origin = `http://${req.headers.host}`;
		const url = new URL(req.url, origin);
		const pathname = url.pathname;

		if (pathname === "/api/ai-proxy") {
			setCors(res);
			if (req.method === "OPTIONS") {
				res.statusCode = 204;
				return res.end();
			}
			if (req.method !== "POST") {
				return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
			}
			let payload = {};
			try {
				payload = await readJsonBody(req);
			} catch {
				return sendJson(res, 400, { ok: false, error: "invalid_json" });
			}
			const { status, body } = await handleAIProposal(
				payload.message,
				payload.elements,
				env.OPENROUTER_API_KEY,
			);
			return sendJson(res, status, body);
		}

		if (pathname === "/api/connectors/jira/automation") {
			return handleJiraAutomation(req, res, env);
		}

		if (pathname === "/api/guidance/pending") {
			setCors(res);
			if (req.method === "OPTIONS") {
				res.statusCode = 204;
				return res.end();
			}
			return handlePendingHandoff(req, res, url);
		}

		const handoffMatch = pathname.match(HANDOFF_ROUTE_RE);
		if (handoffMatch) {
			setCors(res);
			if (req.method === "OPTIONS") {
				res.statusCode = 204;
				return res.end();
			}
			const [, token, isComplete] = handoffMatch;
			if (isComplete) {
				if (req.method !== "POST") {
					return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
				}
				return handleHandoffComplete(req, res, token);
			}
			if (req.method !== "GET") {
				return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
			}
			return handleHandoffFetch(res, token);
		}

		if (pathname === "/ai-widget-sdk.js") {
			res.setHeader("content-type", "application/javascript; charset=utf-8");
			return res.end(widgetJs);
		}

		if (pathname === "/" || pathname === "/bookmarklet") {
			res.setHeader("content-type", "text/html; charset=utf-8");
			return res.end(bookmarkletPage(origin));
		}

		res.statusCode = 404;
		res.end("Not found");
	});
}

/** Start the app; resolves with { server, port }. Pass port 0 in tests. */
export function startServer({ port = 8787, env = process.env } = {}) {
	const server = createApp({ env });
	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(port, () => resolve({ server, port: server.address().port }));
	});
}

export { INTENT_REGISTRY };
