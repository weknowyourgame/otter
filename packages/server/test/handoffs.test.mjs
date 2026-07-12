import test from "node:test";
import assert from "node:assert/strict";
import {
	createHandoff,
	createPendingDelivery,
	consumePendingDelivery,
	getHandoffPlan,
	completeHandoff,
	DEFAULT_TTL_MS,
	_resetForTests,
} from "../lib/handoffs.js";

const ENTRY = {
	intent: "enable_2fa",
	route: "/settings/security",
	targetSelector: "[data-ai-action='enable-2fa']",
	action: "scrollAndHighlight",
	risk: "medium",
};

test.beforeEach(() => _resetForTests());

test("create + fetch returns the browser-safe plan", () => {
	const { token } = createHandoff(ENTRY, { tenantId: "demo", issueKey: "SUP-1" });
	const plan = getHandoffPlan(token);
	assert.deepEqual(
		{ ...plan, expiresAt: undefined },
		{
			tenantId: "demo",
			intent: "enable_2fa",
			route: "/settings/security",
			targetSelector: "[data-ai-action='enable-2fa']",
			action: "scrollAndHighlight",
			risk: "medium",
			expiresAt: undefined,
		},
	);
	// issueKey stays server-side only
	assert.equal("issueKey" in plan, false);
});

test("tokens are long, URL-safe, and unique", () => {
	const seen = new Set();
	for (let i = 0; i < 100; i += 1) {
		const { token } = createHandoff(ENTRY);
		assert.match(token, /^[A-Za-z0-9_-]{20,}$/);
		assert.ok(!seen.has(token));
		seen.add(token);
	}
});

test("default expiry is 15 minutes", () => {
	const now = Date.now();
	const { record } = createHandoff(ENTRY, {}, { now });
	assert.equal(record.expiresAtMs - now, DEFAULT_TTL_MS);
});

test("expired token returns null and is deleted", () => {
	const now = Date.now();
	const { token } = createHandoff(ENTRY, {}, { now, ttlMs: 1000 });
	assert.ok(getHandoffPlan(token, { now: now + 999 }));
	assert.equal(getHandoffPlan(token, { now: now + 1000 }), null);
	// gone for good, even if the clock rolls back
	assert.equal(getHandoffPlan(token, { now }), null);
});

test("unknown token returns null", () => {
	assert.equal(getHandoffPlan("definitely-not-a-token"), null);
});

test("completion accepts known statuses and rejects garbage", () => {
	const { token } = createHandoff(ENTRY);
	assert.equal(completeHandoff(token, { status: "highlighted", url: "http://x" }).ok, true);
	assert.equal(completeHandoff(token, { status: "hacked" }).ok, false);
	assert.equal(completeHandoff("nope", { status: "highlighted" }).ok, false);
});

test("pending delivery is normalized, returned once, and contains only browser-safe fields", () => {
	const { token } = createHandoff(ENTRY);
	assert.equal(
		createPendingDelivery("  Demo@User.Test ", {
			token,
			intent: "enable_2fa",
			replyPreview: "Support found Two-factor authentication.",
		}),
		true,
	);
	assert.deepEqual(consumePendingDelivery("demo@user.test"), {
		token,
		intent: "enable_2fa",
		replyPreview: "Support found Two-factor authentication.",
	});
	assert.equal(consumePendingDelivery("DEMO@USER.TEST"), null);
	// Delivery consumption must not invalidate the public-comment fallback.
	assert.ok(getHandoffPlan(token));
});

test("pending delivery expires with its token", () => {
	const now = Date.now();
	const { token } = createHandoff(ENTRY, {}, { now, ttlMs: 1000 });
	createPendingDelivery("demo@user.test", { token, intent: ENTRY.intent, replyPreview: "Support found 2FA." }, { now });
	assert.equal(consumePendingDelivery("demo@user.test", { now: now + 1000 }), null);
	assert.equal(getHandoffPlan(token, { now: now + 1000 }), null);
});

test("newest pending delivery wins for the same normalized email", () => {
	const first = createHandoff(ENTRY);
	const second = createHandoff({ ...ENTRY, intent: "invite_teammate" });
	createPendingDelivery("demo@user.test", { token: first.token, intent: "enable_2fa", replyPreview: "First" });
	createPendingDelivery(" DEMO@USER.TEST ", { token: second.token, intent: "invite_teammate", replyPreview: "Second" });
	assert.deepEqual(consumePendingDelivery("demo@user.test"), {
		token: second.token,
		intent: "invite_teammate",
		replyPreview: "Second",
	});
});
