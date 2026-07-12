// In-memory handoff store for the demo. A handoff is a short-lived,
// unguessable token that maps to a guidance plan (route + selector +
// action). The support-tool comment carries only the token in a URL — no
// customer data — and the SDK exchanges it for the plan via
// GET /api/guidance/handoffs/:token.

import crypto from "node:crypto";

export const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

const handoffs = new Map(); // token -> record
// normalized email -> pending delivery. This intentionally contains only
// browser-safe delivery metadata; reporter details and Jira issue content
// never enter this store.
const pendingDeliveries = new Map();
const auditLog = []; // demo-scale audit trail, newest last

function audit(event, details) {
	const entry = { at: new Date().toISOString(), event, ...details };
	auditLog.push(entry);
	console.log(`[guidance-audit] ${JSON.stringify(entry)}`);
}

export function normalizeEmail(email) {
	return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function emailFingerprint(email) {
	return crypto.createHash("sha256").update(email).digest("hex").slice(0, 12);
}

function pruneExpired(now = Date.now()) {
	for (const [token, record] of handoffs) {
		if (record.expiresAtMs <= now) handoffs.delete(token);
	}
	for (const [email, delivery] of pendingDeliveries) {
		if (delivery.expiresAtMs <= now || !handoffs.has(delivery.token)) {
			pendingDeliveries.delete(email);
		}
	}
}

/**
 * Create a handoff for a resolved intent. Returns { token, record }.
 * `context` is stored server-side for auditing (issueKey, tenantId, source)
 * and is never included in the plan the browser fetches.
 */
export function createHandoff(entry, context = {}, { ttlMs = DEFAULT_TTL_MS, now = Date.now() } = {}) {
	pruneExpired(now);
	const token = crypto.randomBytes(24).toString("base64url");
	const record = {
		tenantId: context.tenantId || "demo",
		issueKey: context.issueKey || null,
		source: context.source || null,
		intent: entry.intent,
		route: entry.route,
		targetSelector: entry.targetSelector,
		action: entry.action,
		risk: entry.risk,
		createdAtMs: now,
		expiresAtMs: now + ttlMs,
	};
	handoffs.set(token, record);
	audit("handoff_created", {
		token,
		intent: entry.intent,
		issueKey: record.issueKey,
		tenantId: record.tenantId,
		expiresAt: new Date(record.expiresAtMs).toISOString(),
	});
	return { token, record };
}

/**
 * Fetch a handoff plan by token. Returns the browser-safe plan, or null if
 * unknown/expired. Every fetch is audited.
 */
export function getHandoffPlan(token, { now = Date.now() } = {}) {
	const record = handoffs.get(token);
	if (!record || record.expiresAtMs <= now) {
		audit("handoff_fetch_rejected", { token, reason: record ? "expired" : "unknown" });
		if (record) handoffs.delete(token);
		return null;
	}
	audit("handoff_fetched", { token, intent: record.intent, issueKey: record.issueKey });
	return {
		tenantId: record.tenantId,
		intent: record.intent,
		route: record.route,
		targetSelector: record.targetSelector,
		action: record.action,
		risk: record.risk,
		expiresAt: new Date(record.expiresAtMs).toISOString(),
	};
}

/**
 * Park a one-time browser delivery for a handoff. The email is normalized
 * before use as a key and is never placed in audit logs; a short hash is
 * sufficient for correlating demo diagnostics without exposing PII.
 */
export function createPendingDelivery(email, { token, intent, replyPreview } = {}, { now = Date.now() } = {}) {
	pruneExpired(now);
	const normalizedEmail = normalizeEmail(email);
	const handoff = handoffs.get(token);
	if (!normalizedEmail || !handoff || handoff.expiresAtMs <= now) return false;

	const delivery = {
		token,
		intent: typeof intent === "string" ? intent.slice(0, 100) : handoff.intent,
		replyPreview: typeof replyPreview === "string" ? replyPreview.slice(0, 300) : "Support found guidance.",
		expiresAtMs: handoff.expiresAtMs,
	};
	pendingDeliveries.set(normalizedEmail, delivery); // newest delivery wins
	audit("pending_handoff_created", {
		emailHash: emailFingerprint(normalizedEmail),
		token,
		intent: delivery.intent,
		expiresAt: new Date(delivery.expiresAtMs).toISOString(),
	});
	return true;
}

/**
 * Consume and return the pending delivery for an email. Consumption affects
 * only this queue: the original token remains usable through its normal TTL,
 * preserving the Jira comment/link fallback.
 */
export function consumePendingDelivery(email, { now = Date.now() } = {}) {
	pruneExpired(now);
	const normalizedEmail = normalizeEmail(email);
	if (!normalizedEmail) return null;
	const delivery = pendingDeliveries.get(normalizedEmail);
	if (!delivery) return null;
	pendingDeliveries.delete(normalizedEmail);
	audit("pending_handoff_delivered", {
		emailHash: emailFingerprint(normalizedEmail),
		token: delivery.token,
		intent: delivery.intent,
	});
	return {
		token: delivery.token,
		intent: delivery.intent,
		replyPreview: delivery.replyPreview,
	};
}

const COMPLETION_STATUSES = new Set(["opened", "highlighted", "approved_click", "blocked", "failed"]);

/**
 * Record what the SDK actually did with a handoff. Tokens stay valid until
 * expiry (a user may reload the page), so completion doesn't consume them.
 */
export function completeHandoff(token, { status, url, reason } = {}, { now = Date.now() } = {}) {
	if (!COMPLETION_STATUSES.has(status)) return { ok: false, error: "invalid_status" };
	const record = handoffs.get(token);
	if (!record || record.expiresAtMs <= now) return { ok: false, error: "unknown_or_expired" };
	audit("handoff_completed", {
		token,
		intent: record.intent,
		issueKey: record.issueKey,
		status,
		url: typeof url === "string" ? url.slice(0, 300) : null,
		reason: typeof reason === "string" ? reason.slice(0, 300) : null,
	});
	return { ok: true };
}

export function getAuditLog() {
	return [...auditLog];
}

/** Test hook: wipe all state. */
export function _resetForTests() {
	handoffs.clear();
	pendingDeliveries.clear();
	auditLog.length = 0;
}
