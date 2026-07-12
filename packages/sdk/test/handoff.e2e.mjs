// End-to-end test of the SDK's handoff mode against the real backend and the
// real built SDK bundle, driven by Playwright. Run from the repo root with
// `npm test` (packages/sdk must be built first).
//
// Covers:
//   - SDK reads ?guide_handoff from the URL and fetches the plan
//   - SDK highlights the plan's target selector
//   - SDK refuses to click for a high-risk plan (highlight-only + blocked audit)

import assert from "node:assert/strict";
import http from "node:http";
import { chromium } from "playwright";
import { startServer } from "../../server/lib/app.js";
import { createHandoff, createPendingDelivery, getAuditLog } from "../../server/lib/handoffs.js";

const SECRET = "e2e-secret";

// --- backend (same process, so we can also inspect the audit log) ---
const { server: backend } = await startServer({
	port: 0,
	env: { JIRA_AUTOMATION_SECRET: SECRET, DEMO_APP_URL: "http://unused.test" },
});
const backendBase = `http://localhost:${backend.address().port}`;

// --- tiny static "SaaS app" ---
const page2fa = `<!doctype html><html><body>
  <h1>Security</h1>
  <section data-ai-section="security">
    <button data-ai-action="enable-2fa" onclick="window.__clicked=true">Two-factor authentication</button>
  </section>
  <script src="${backendBase}/ai-widget-sdk.js"
    data-ai-proxy-url="${backendBase}/api/ai-proxy"
    data-ai-guidance-base-url="${backendBase}"
    data-ai-user-email="demo@user.test"></script>
</body></html>`;

const pageBilling = `<!doctype html><html><body>
  <h1>Billing</h1>
  <section data-ai-section="billing">
    <button data-ai-action="change-card" onclick="window.__clicked=true">Change payment method</button>
  </section>
  <script src="${backendBase}/ai-widget-sdk.js"
    data-ai-proxy-url="${backendBase}/api/ai-proxy"
    data-ai-guidance-base-url="${backendBase}"
    data-ai-user-email="demo@user.test"></script>
</body></html>`;

const pageHome = `<!doctype html><html><body>
  <h1>Home</h1>
  <script src="${backendBase}/ai-widget-sdk.js"
    data-ai-proxy-url="${backendBase}/api/ai-proxy"
    data-ai-guidance-base-url="${backendBase}"
    data-ai-user-email="demo@user.test"></script>
</body></html>`;

const demoApp = http.createServer((req, res) => {
	const path = new URL(req.url, "http://x").pathname;
	res.setHeader("content-type", "text/html; charset=utf-8");
	if (path === "/settings/security") return res.end(page2fa);
	if (path === "/settings/billing") return res.end(pageBilling);
	if (path === "/") return res.end(pageHome);
	res.statusCode = 404;
	res.end("nope");
});
await new Promise((resolve) => demoApp.listen(0, resolve));
const demoBase = `http://localhost:${demoApp.address().port}`;

const browser = await chromium.launch();
let failures = 0;
const check = (name, fn) => {
	try {
		fn();
		console.log(`PASS ${name}`);
	} catch (err) {
		failures += 1;
		console.error(`FAIL ${name}: ${err.message}`);
	}
};

const highlightVisible = (page) =>
	page.evaluate(() => {
		const host = document.getElementById("ai-widget-sdk-host");
		return Boolean(host && host.shadowRoot.querySelector(".aiw-highlight-box"));
	});
const assistantMessages = (page) =>
	page.evaluate(() => {
		const host = document.getElementById("ai-widget-sdk-host");
		return [...host.shadowRoot.querySelectorAll(".aiw-msg-assistant")].map((e) => e.textContent);
	});
const approvalVisible = (page) =>
	page.evaluate(() => {
		const host = document.getElementById("ai-widget-sdk-host");
		return host?.shadowRoot.querySelector(".aiw-approval") != null;
	});
const clickInWidget = (page, selector) =>
	page.evaluate((target) => {
		const host = document.getElementById("ai-widget-sdk-host");
		(host?.shadowRoot.querySelector(target)).click();
	}, selector);

// ---------------------------------------------------------------
// Scenario A: full path — webhook -> token -> highlight
// ---------------------------------------------------------------
{
	const webhookRes = await fetch(`${backendBase}/api/connectors/jira/automation`, {
		method: "POST",
		headers: { "content-type": "application/json", "x-guidance-demo-secret": SECRET },
		body: JSON.stringify({ issueKey: "E2E-1", summary: "Where do I enable 2FA?" }),
	});
	const webhook = await webhookRes.json();
	const token = new URL(webhook.handoffUrl).searchParams.get("guide_handoff");
	check("webhook resolves 2FA intent", () => assert.equal(webhook.intent, "enable_2fa"));

	const page = await browser.newPage();
	await page.goto(`${demoBase}/settings/security?guide_handoff=${token}`, {
		waitUntil: "networkidle",
	});
	await page.waitForFunction(
		() =>
			document.getElementById("ai-widget-sdk-host")?.shadowRoot.querySelector(
				".aiw-highlight-box",
			) != null,
		{ timeout: 10000 },
	);

	check("SDK read token and highlighted the 2FA target", async () => {
		assert.equal(await highlightVisible(page), true);
	});
	const msgs = await assistantMessages(page);
	check("assistant announced the found control", () =>
		assert.ok(msgs.some((m) => m.includes('I found "Two-factor authentication"')), msgs.join("|")),
	);
	check("scrollAndHighlight plan did NOT click", async () =>
		assert.equal(await page.evaluate(() => window.__clicked), undefined),
	);
	await page.close();
}

// ---------------------------------------------------------------
// Scenario D: Jira email-correlated pending delivery -> approval -> navigate
// ---------------------------------------------------------------
{
	const page = await browser.newPage();
	await page.goto(`${demoBase}/`, { waitUntil: "networkidle" });
	const webhookRes = await fetch(`${backendBase}/api/connectors/jira/automation`, {
		method: "POST",
		headers: { "content-type": "application/json", "x-guidance-demo-secret": SECRET },
		body: JSON.stringify({
			issueKey: "E2E-2",
			summary: "Where do I enable 2FA?",
			reporterEmail: "demo@user.test",
		}),
	});
	const webhook = await webhookRes.json();
	check("webhook still returns the public-comment link fallback", () =>
		assert.ok(webhook.replyMarkdown.includes(webhook.handoffUrl)),
	);
	await page.waitForFunction(
		() => document.getElementById("ai-widget-sdk-host")?.shadowRoot.querySelector(".aiw-approval") != null,
		{ timeout: 10000 },
	);
	assert.equal(new URL(page.url()).pathname, "/");
	assert.equal(new URL(page.url()).search, "");
	assert.equal(await approvalVisible(page), true);
	console.log("PASS matching email gets an approval card without a URL change");
	const pendingMessages = await assistantMessages(page);
	check("pending approval names the support target", () =>
		assert.ok(pendingMessages.some((m) => m.includes("Support found Two-factor authentication"))),
	);
	await clickInWidget(page, ".aiw-allow");
	await page.waitForURL(`${demoBase}/settings/security?guide_handoff=*`, { timeout: 10000 });
	await page.waitForFunction(
		() => document.getElementById("ai-widget-sdk-host")?.shadowRoot.querySelector(".aiw-highlight-box") != null,
		{ timeout: 10000 },
	);
	assert.equal(await highlightVisible(page), true);
	assert.equal(await page.evaluate(() => window.__clicked), undefined);
	console.log("PASS pending Allow reused the handoff executor and highlighted 2FA");
	await page.close();
}

// ---------------------------------------------------------------
// Scenario E: dismiss / identity isolation / high-risk safety via polling
// ---------------------------------------------------------------
{
	const page = await browser.newPage();
	await page.goto(`${demoBase}/settings/security`, { waitUntil: "networkidle" });
	const { token: dismissedToken } = createHandoff({
		intent: "enable_2fa",
		route: "/settings/security",
		targetSelector: "[data-ai-action='enable-2fa']",
		action: "scrollAndHighlight",
		risk: "medium",
	});
	createPendingDelivery("demo@user.test", {
		token: dismissedToken,
		intent: "enable_2fa",
		replyPreview: "Support found Two-factor authentication.",
	});
	await page.waitForFunction(
		() => document.getElementById("ai-widget-sdk-host")?.shadowRoot.querySelector(".aiw-approval") != null,
		{ timeout: 10000 },
	);
	await clickInWidget(page, ".aiw-cancel");
	await page.waitForTimeout(200);
	check("Dismiss reports a user_dismissed block", () =>
		assert.ok(
			getAuditLog().some(
				(e) => e.event === "handoff_completed" && e.token === dismissedToken && e.reason === "user_dismissed",
			),
		),
	);

	const other = createHandoff({
		intent: "enable_2fa",
		route: "/settings/security",
		targetSelector: "[data-ai-action='enable-2fa']",
		action: "scrollAndHighlight",
		risk: "medium",
	});
	createPendingDelivery("other@user.test", {
		token: other.token,
		intent: "enable_2fa",
		replyPreview: "This must not surface.",
	});
	await page.waitForTimeout(5500);
	assert.equal(await approvalVisible(page), false);
	console.log("PASS handoff for another email never surfaces");

	const highRisk = createHandoff({
		intent: "billing_settings",
		route: "/settings/billing",
		targetSelector: "[data-ai-action='change-card']",
		action: "click",
		risk: "high",
	});
	createPendingDelivery("demo@user.test", {
		token: highRisk.token,
		intent: "billing_settings",
		replyPreview: "Support found Billing settings.",
	});
	await page.waitForFunction(
		() => document.getElementById("ai-widget-sdk-host")?.shadowRoot.querySelector(".aiw-approval") != null,
		{ timeout: 10000 },
	);
	await clickInWidget(page, ".aiw-allow");
	await page.waitForURL(`${demoBase}/settings/billing?guide_handoff=*`, { timeout: 10000 });
	await page.waitForFunction(
		() => document.getElementById("ai-widget-sdk-host")?.shadowRoot.querySelector(".aiw-highlight-box") != null,
		{ timeout: 10000 },
	);
	assert.equal(await page.evaluate(() => window.__clicked), undefined);
	console.log("PASS high-risk pending plan remains highlight-only");
	await page.close();
}

// ---------------------------------------------------------------
// Scenario B: high-risk plan with action "click" — must be refused
// ---------------------------------------------------------------
{
	const { token } = createHandoff({
		intent: "billing_settings",
		route: "/settings/billing",
		targetSelector: "[data-ai-action='change-card']",
		action: "click",
		risk: "high",
	});

	const page = await browser.newPage();
	await page.goto(`${demoBase}/settings/billing?guide_handoff=${token}`, {
		waitUntil: "networkidle",
	});
	await page.waitForFunction(
		() =>
			document.getElementById("ai-widget-sdk-host")?.shadowRoot.querySelector(
				".aiw-highlight-box",
			) != null,
		{ timeout: 10000 },
	);

	check("high-risk click plan never clicked", async () =>
		assert.equal(await page.evaluate(() => window.__clicked), undefined),
	);
	check("high-risk click plan shows no approval card either", async () =>
		assert.equal(
			await page.evaluate(() => {
				const host = document.getElementById("ai-widget-sdk-host");
				return host.shadowRoot.querySelector(".aiw-approval") != null;
			}),
			false,
		),
	);
	const msgs = await assistantMessages(page);
	check("user is told it was downgraded to highlight-only", () =>
		assert.ok(msgs.some((m) => m.includes("only show you where it is")), msgs.join("|")),
	);
	check("backend audit recorded the block", () =>
		assert.ok(
			getAuditLog().some((e) => e.event === "handoff_completed" && e.status === "blocked"),
		),
	);
	await page.close();
}

// ---------------------------------------------------------------
// Scenario C: expired/unknown token -> friendly failure, no highlight
// ---------------------------------------------------------------
{
	const page = await browser.newPage();
	await page.goto(`${demoBase}/settings/security?guide_handoff=BogusToken123`, {
		waitUntil: "networkidle",
	});
	await page.waitForFunction(
		() =>
			document
				.getElementById("ai-widget-sdk-host")
				?.shadowRoot.querySelectorAll(".aiw-msg-assistant").length > 0,
		{ timeout: 10000 },
	);
	const msgs = await assistantMessages(page);
	check("bogus token shows expired-link message", () =>
		assert.ok(msgs.some((m) => m.includes("invalid or has expired")), msgs.join("|")),
	);
	check("bogus token highlights nothing", async () =>
		assert.equal(await highlightVisible(page), false),
	);
	await page.close();
}

await browser.close();
backend.close();
demoApp.close();

console.log(failures === 0 ? "\nALL E2E CHECKS PASSED" : `\n${failures} E2E CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
