import test from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../lib/app.js";

const SECRET = "test-secret-for-webhook-tests";

// No OPENROUTER_API_KEY -> the LLM fallback is skipped, so these tests are
// fully deterministic and offline.
const env = {
	JIRA_AUTOMATION_SECRET: SECRET,
	DEMO_APP_URL: "https://demo-app.test",
};

let server;
let base;

test.before(async () => {
	({ server } = await startServer({ port: 0, env }));
	base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const post = (path, body, headers = {}) =>
	fetch(`${base}${path}`, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});

test("rejects missing secret with 401 JSON", async () => {
	const res = await post("/api/connectors/jira/automation", { summary: "enable 2fa" });
	assert.equal(res.status, 401);
	assert.match(res.headers.get("content-type"), /application\/json/);
	assert.deepEqual(await res.json(), { ok: false, error: "invalid_secret" });
});

test("rejects wrong secret with 401", async () => {
	const res = await post(
		"/api/connectors/jira/automation",
		{ summary: "enable 2fa" },
		{ "x-guidance-demo-secret": "wrong" },
	);
	assert.equal(res.status, 401);
});

test("503 when the webhook secret is not configured server-side", async () => {
	const { server: bare } = await startServer({ port: 0, env: {} });
	try {
		const res = await fetch(
			`http://localhost:${bare.address().port}/api/connectors/jira/automation`,
			{ method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
		);
		assert.equal(res.status, 503);
	} finally {
		bare.close();
	}
});

test("2FA question returns JSON with replyMarkdown + working handoff", async () => {
	const res = await post(
		"/api/connectors/jira/automation",
		{
			tenantId: "demo",
			source: "jira_service_management",
			issueKey: "SUP-9",
			summary: "Where do I enable 2FA?",
			description: "",
		},
		{ "x-guidance-demo-secret": SECRET },
	);
	assert.equal(res.status, 200);
	assert.match(res.headers.get("content-type"), /application\/json/);
	const body = await res.json();
	assert.equal(body.ok, true);
	assert.equal(body.intent, "enable_2fa");
	assert.ok(body.replyMarkdown.includes(body.handoffUrl));
	assert.ok(body.handoffUrl.startsWith("https://demo-app.test/settings/security?guide_handoff="));
	assert.ok(Date.parse(body.expiresAt) > Date.now());

	// the token in the URL must resolve to a real plan
	const token = new URL(body.handoffUrl).searchParams.get("guide_handoff");
	const planRes = await fetch(`${base}/api/guidance/handoffs/${token}`);
	assert.equal(planRes.status, 200);
	const { plan } = await planRes.json();
	assert.equal(plan.intent, "enable_2fa");
	assert.equal(plan.route, "/settings/security");
});

test("unknown intent returns helpful reply and creates no handoff", async () => {
	const res = await post(
		"/api/connectors/jira/automation",
		{ issueKey: "SUP-10", summary: "the moon is purple and my keyboard is on fire" },
		{ "x-guidance-demo-secret": SECRET },
	);
	assert.equal(res.status, 200);
	const body = await res.json();
	assert.equal(body.ok, true);
	assert.equal(body.intent, null);
	assert.equal(body.handoffUrl, undefined);
	assert.match(body.replyMarkdown, /could not find a guided action/);
});

test("user text is never echoed into replyMarkdown", async () => {
	const res = await post(
		"/api/connectors/jira/automation",
		{ issueKey: "SUP-11", summary: "enable 2fa <script>alert(1)</script> [link](http://evil)" },
		{ "x-guidance-demo-secret": SECRET },
	);
	const body = await res.json();
	assert.equal(body.intent, "enable_2fa");
	assert.ok(!body.replyMarkdown.includes("script"));
	assert.ok(!body.replyMarkdown.includes("evil"));
});

test("invalid JSON body -> 400", async () => {
	const res = await fetch(`${base}/api/connectors/jira/automation`, {
		method: "POST",
		headers: { "content-type": "application/json", "x-guidance-demo-secret": SECRET },
		body: "{not json",
	});
	assert.equal(res.status, 400);
});

test("GET on the webhook route -> 405", async () => {
	const res = await fetch(`${base}/api/connectors/jira/automation`);
	assert.equal(res.status, 405);
});

test("unknown handoff token -> 404", async () => {
	const res = await fetch(`${base}/api/guidance/handoffs/AAAAAAAAAAAAAAAAAAAAAAAA`);
	assert.equal(res.status, 404);
});
