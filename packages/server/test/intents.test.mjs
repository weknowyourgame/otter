import test from "node:test";
import assert from "node:assert/strict";
import { resolveIntent, INTENT_REGISTRY } from "../lib/intents.js";

test("matches 'where do I enable 2FA'", () => {
	const entry = resolveIntent("Where do I enable 2FA?");
	assert.equal(entry?.intent, "enable_2fa");
	assert.equal(entry?.route, "/settings/security");
	assert.equal(entry?.targetSelector, "[data-ai-action='enable-2fa']");
});

test("matches 'turn on two factor'", () => {
	assert.equal(resolveIntent("please turn on two factor for me")?.intent, "enable_2fa");
});

test("matches case-insensitively and across summary+description style text", () => {
	assert.equal(resolveIntent("HOW DO I SET UP AN AUTHENTICATOR\nthanks")?.intent, "enable_2fa");
});

test("matches invite teammate", () => {
	assert.equal(resolveIntent("how can I add a team member?")?.intent, "invite_teammate");
});

test("matches billing and it is high risk", () => {
	const entry = resolveIntent("where do I change my payment method?");
	assert.equal(entry?.intent, "billing_settings");
	assert.equal(entry?.risk, "high");
});

test("unknown question returns null (no fake selectors)", () => {
	assert.equal(resolveIntent("my keyboard is on fire and the moon is purple"), null);
});

test("empty/garbage input returns null", () => {
	assert.equal(resolveIntent(""), null);
	assert.equal(resolveIntent(null), null);
	assert.equal(resolveIntent(undefined), null);
});

test("every registry entry has the fields the handoff plan needs", () => {
	for (const entry of INTENT_REGISTRY) {
		assert.ok(entry.intent && entry.route && entry.targetSelector && entry.action && entry.risk);
		assert.ok(entry.aliases.length > 0);
		assert.ok(entry.reply);
	}
});
