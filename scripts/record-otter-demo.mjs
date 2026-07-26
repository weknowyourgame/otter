#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const baseUrl = (process.env.OTTER_WEB_URL || "http://localhost:3001").replace(
	/\/$/,
	"",
);
const databaseUrl =
	process.env.DATABASE_URL || "postgres://localhost:5432/otter";
const shouldReset = process.env.OTTER_DEMO_RESET !== "0";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = join(rootDir, "demo-artifacts", `otter-demo-${stamp}`);
const screenshotDir = join(artifactDir, "screenshots");
const videoDir = join(artifactDir, "video");
const mockDir = join(artifactDir, "mock-data");
const summaryPath = join(artifactDir, "summary.json");
const mockFilePath = join(mockDir, "cordant-support-runbook.md");
const pauseScale = Number(process.env.OTTER_DEMO_PAUSE_SCALE || "0.7");

const demoUser = {
	name: "Alex Morgan",
	email: "alex@cordant.dev",
	password: "OtterDemo2026!",
	org: "Cordant Inc.",
	website: "Cordant Workspace",
	origin: "http://localhost:3001",
};

const agentPrompt = `AI support assistant for Cordant.

Be friendly, concise, and professional. Use the knowledge base before answering policy or account questions.

Operational playbook:
- If a user forgot their password, open My settings > Security and send a password reset email.
- If a user wants notification settings changed, open My settings > Notifications and update the visible preference.
- If a user asks for Apollo, open Projects and select Apollo Launch.
- If a user asks to create an automation, use the Automation page and complete the wizard using the values the user gives.
- Remember durable user preferences when they are explicitly stated.`;

const faqEntries = [
	{
		question: "How do I reset my password?",
		answer:
			"Open My settings, go to Security, and send yourself a password reset email. The reset link is sent to the email address on your Cordant profile.",
	},
	{
		question: "What is your refund policy?",
		answer:
			"Customers can request a refund within 30 days of a new annual subscription or within 7 days of a monthly renewal if the workspace has low usage.",
	},
	{
		question: "How does billing work?",
		answer:
			"Cordant bills per workspace seat on a monthly cycle. Plan changes are prorated immediately, and invoices appear in Admin > Billing.",
	},
];

const mockRunbook = `# Cordant Support Runbook

## Password resets
Users who forget a password should use My settings > Security and request a password reset email. Support agents should never ask for a user's current password.

## Notification preferences
Users can control email notifications from My settings > Notifications. Sarah prefers email notifications for assigned tickets, mentions, and weekly summaries.

## Apollo Launch
Apollo Launch is the enterprise rollout project for high-touch customer onboarding. It is led by Marcus Webb.

## Automation
For urgent billing issues, create an automation with the Ticket created trigger, a Priority condition, and actions that assign the ticket to Marcus Webb and add a billing label.
`;

function ensureDirs() {
	for (const dir of [artifactDir, screenshotDir, videoDir, mockDir]) {
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(mockFilePath, mockRunbook);
}

async function waitForService(url, label) {
	const deadline = Date.now() + 20_000;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(url);
			if (res.ok) return;
		} catch {
			// Keep waiting.
		}
		await new Promise((resolve) => setTimeout(resolve, 750));
	}
	throw new Error(`${label} is not responding at ${url}`);
}

function resetDemoAccount() {
	if (!shouldReset) return;
	const sql = `
WITH target_users AS (
	SELECT id FROM "user" WHERE email = '${demoUser.email}'
), target_tenants AS (
	SELECT tenant_id FROM tenant_members WHERE user_id IN (SELECT id FROM target_users)
)
DELETE FROM tenants WHERE id IN (SELECT tenant_id FROM target_tenants);
DELETE FROM "user" WHERE email = '${demoUser.email}';
`;
	try {
		execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", sql], {
			stdio: "pipe",
		});
	} catch (_error) {
		console.warn(
			"[demo] Could not reset alex@cordant.dev before recording. Continuing.",
		);
	}
}

async function main() {
	ensureDirs();
	await waitForService(`${baseUrl}/login`, "Otter web");
	await waitForService("http://localhost:8787/health", "Otter API");
	resetDemoAccount();

	const browser = await chromium.launch({
		headless: false,
		args: ["--window-size=1440,900"],
	});
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
		deviceScaleFactor: 1,
	});
	const page = await context.newPage();
	page.setDefaultTimeout(20_000);

	const screenshots = [];
	let demoPublicKey = "";

	async function pause(ms = 900) {
		await page.waitForTimeout(Math.max(80, Math.round(ms * pauseScale)));
	}

	async function shot(name) {
		await ensureCursor();
		const file = join(
			screenshotDir,
			`${String(screenshots.length + 1).padStart(2, "0")}-${name}.png`,
		);
		await page.screenshot({ path: file, fullPage: false });
		screenshots.push(file);
		return file;
	}

	async function ensureCursor() {
		await page.evaluate(() => {
			if (document.getElementById("otter-demo-cursor")) return;
			const style = document.createElement("style");
			style.id = "otter-demo-cursor-style";
			style.textContent = `
				#otter-demo-cursor {
					position: fixed;
					left: 0;
					top: 0;
					width: 26px;
					height: 32px;
					z-index: 2147482900;
					pointer-events: none;
					transform: translate(720px, 450px);
					transition: transform 680ms cubic-bezier(.19,1,.22,1), opacity 220ms ease;
					filter: drop-shadow(0 9px 20px rgba(15, 23, 42, .22));
				}
				#otter-demo-cursor::before {
					content: "";
					position: absolute;
					left: 0;
					top: 0;
					width: 0;
					height: 0;
					border-left: 9px solid #111827;
					border-top: 0 solid transparent;
					border-bottom: 22px solid transparent;
					transform: rotate(-18deg);
				}
				#otter-demo-cursor::after {
					content: "";
					position: absolute;
					left: 6px;
					top: 15px;
					width: 12px;
					height: 12px;
					border-radius: 999px;
					background: #ffffff;
					border: 2px solid #111827;
				}
				#otter-demo-cursor[data-hidden="true"] {
					opacity: 0;
				}
				#otter-demo-fade {
					position: fixed;
					inset: 0;
					z-index: 2147482899;
					pointer-events: none;
					background: #ffffff;
					opacity: 0;
					transition: opacity 260ms ease;
				}
			`;
			document.head.appendChild(style);
			const cursor = document.createElement("div");
			cursor.id = "otter-demo-cursor";
			cursor.setAttribute("aria-hidden", "true");
			document.body.appendChild(cursor);
		});
	}

	async function setDemoCursorVisible(visible) {
		await ensureCursor();
		await page.evaluate((isVisible) => {
			document
				.getElementById("otter-demo-cursor")
				?.setAttribute("data-hidden", isVisible ? "false" : "true");
		}, visible);
	}

	async function moveCursorTo(x, y, steps = 24) {
		await ensureCursor();
		await page.evaluate(
			({ x: nextX, y: nextY }) => {
				const cursor = document.getElementById("otter-demo-cursor");
				if (cursor)
					cursor.style.transform = `translate(${nextX}px, ${nextY}px)`;
			},
			{ x, y },
		);
		await page.mouse.move(x, y, { steps });
		await pause(180);
	}

	async function center(locator) {
		await locator.waitFor({ state: "visible" });
		await locator.scrollIntoViewIfNeeded();
		const box = await locator.boundingBox();
		if (!box) throw new Error("No bounding box for locator");
		return {
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		};
	}

	async function cinematicClick(locator, wait = 650) {
		const point = await center(locator);
		await moveCursorTo(point.x, point.y);
		await page.mouse.down();
		await pause(70);
		await page.mouse.up();
		await pause(wait);
	}

	async function cinematicFill(locator, value, delay = 20) {
		await cinematicClick(locator, 120);
		const modifier = process.platform === "darwin" ? "Meta" : "Control";
		await page.keyboard.press(`${modifier}+A`);
		await page.keyboard.type(value, { delay });
		await pause(360);
	}

	async function gotoPath(path, wait = 900) {
		await ensureCursor().catch(() => {});
		await page
			.evaluate(() => {
				const fade = document.createElement("div");
				fade.id = "otter-demo-fade";
				document.body.appendChild(fade);
				requestAnimationFrame(() => {
					fade.style.opacity = "0.82";
				});
			})
			.catch(() => {});
		await page.waitForTimeout(190).catch(() => {});
		await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
		await ensureCursor();
		await page
			.evaluate(() => {
				const fade = document.createElement("div");
				fade.id = "otter-demo-fade";
				fade.style.opacity = "0.82";
				document.body.appendChild(fade);
				requestAnimationFrame(() => {
					fade.style.opacity = "0";
					window.setTimeout(() => fade.remove(), 320);
				});
			})
			.catch(() => {});
		await pause(wait);
	}

	async function signUp() {
		await gotoPath("/", 900);
		await shot("login");
		await cinematicClick(page.getByRole("tab", { name: "Create account" }));
		await cinematicFill(page.getByLabel("Name"), demoUser.name);
		await cinematicFill(page.getByLabel("Email"), demoUser.email);
		await cinematicFill(page.getByLabel("Password"), demoUser.password);
		await shot("signup-filled");
		await cinematicClick(
			page.getByRole("button", { name: "Create workspace" }),
			1000,
		);
		await page
			.waitForURL(`${baseUrl}/dashboard`, { timeout: 25_000 })
			.catch(async () => {
				if (!page.url().includes("/dashboard")) {
					await cinematicClick(page.getByRole("tab", { name: "Sign in" }));
					await cinematicFill(page.getByLabel("Email"), demoUser.email);
					await cinematicFill(page.getByLabel("Password"), demoUser.password);
					await cinematicClick(
						page.getByRole("button", { name: "Enter workspace" }),
						1000,
					);
					await page.waitForURL(`${baseUrl}/dashboard`, { timeout: 25_000 });
				}
			});
		await pause(1100);
		await shot("dashboard-empty");
	}

	async function organizationAndWebsite() {
		await gotoPath("/org/create");
		await cinematicFill(page.getByLabel("Organization name"), demoUser.org);
		await shot("organization");
		await cinematicClick(
			page.getByRole("button", { name: "Save organization" }),
			1000,
		);
		await page.waitForURL(`${baseUrl}/websites/create`, { timeout: 15_000 });
		await cinematicFill(page.getByLabel("Website name"), demoUser.website);
		await cinematicFill(page.getByLabel("Production domain"), demoUser.origin);
		await shot("website-details");
		await cinematicClick(
			page.getByRole("button", { name: "Create website" }),
			1200,
		);
		await page.waitForFunction(
			() => document.body.innerText.includes("Install Otter"),
			null,
			{
				timeout: 15_000,
			},
		);
		await page.waitForFunction(
			() => /pk_test_[0-9a-f]{64}/.test(document.body.innerText),
			null,
			{ timeout: 20_000 },
		);
		const installText = await page.locator("pre").innerText();
		demoPublicKey = installText.match(/pk_test_[0-9a-f]{64}/)?.[0] || "";
		if (!demoPublicKey) throw new Error("Could not read generated public key");
		await shot("install-key");
		await cinematicClick(
			page.getByRole("button", { name: "I installed Otter" }),
			1100,
		);
		await shot("website-ready");
		await cinematicClick(
			page.getByRole("link", { name: "Create AI agent" }),
			1100,
		);
	}

	async function agentOnboarding() {
		await page.waitForURL(`${baseUrl}/agent/create`, { timeout: 15_000 });
		await cinematicFill(page.getByLabel("Agent name"), "Otter");
		await cinematicFill(
			page.getByLabel("Website URL"),
			"https://docs.firecrawl.dev/features/scrape",
		);
		await shot("agent-basics");
		await cinematicClick(page.getByRole("button", { name: "Continue" }), 3000);
		await page.waitForFunction(
			() => document.body.innerText.includes("Shape its personality."),
			null,
			{ timeout: 12_000 },
		);
		await cinematicClick(
			page.getByRole("button", { name: "Warm & concise" }),
			500,
		);
		await cinematicFill(page.getByLabel("System prompt"), agentPrompt, 2);
		await shot("agent-personality");
		await cinematicClick(
			page.getByRole("button", { name: "Finish setup" }),
			1800,
		);
		await page.waitForURL(`${baseUrl}/agent`, { timeout: 20_000 });
		await shot("agent-general");
	}

	async function configureAgentPages() {
		await cinematicFill(page.getByLabel("Agent name"), "Otter");
		await cinematicFill(page.getByLabel("System prompt"), agentPrompt, 2);
		await cinematicClick(
			page.getByRole("button", { name: "Save agent" }),
			1200,
		);
		await gotoPath("/agent/behaviour");
		await cinematicClick(page.getByRole("button", { name: "Concise" }));
		await cinematicFill(
			page.getByLabel("Voice & tone"),
			"Friendly, concise, and professional. Prefer direct answers and clear next steps.",
			5,
		);
		await cinematicClick(
			page
				.locator(".od-settings-section")
				.filter({ hasText: "Voice & tone" })
				.getByRole("button", { name: "Save behavior" }),
			1000,
		);
		await shot("agent-behaviour");
		await gotoPath("/agent/tools");
		await shot("agent-tools");
	}

	async function addFaqViaApi(question, answer) {
		await page.evaluate(
			async ({ q, a }) => {
				await fetch("/api/faqs", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ question: q, answer: a }),
				});
			},
			{ q: question, a: answer },
		);
	}

	async function addKnowledge() {
		await gotoPath("/agent/knowledge/web-sources");
		await shot("web-sources");
		await waitForWebSourceReady();
		await shot("web-source-ready");

		await gotoPath("/agent/knowledge/faq");
		await cinematicClick(page.getByRole("button", { name: "Add FAQ" }));
		await cinematicFill(page.getByLabel("Question"), faqEntries[0].question);
		await cinematicFill(page.getByLabel("Answer"), faqEntries[0].answer, 5);
		await shot("faq-modal");
		await cinematicClick(
			page.getByRole("dialog").getByRole("button", { name: "Add FAQ" }),
			1200,
		);
		await addFaqViaApi(faqEntries[1].question, faqEntries[1].answer);
		await addFaqViaApi(faqEntries[2].question, faqEntries[2].answer);
		await page.reload({ waitUntil: "domcontentloaded" });
		await pause(900);
		await shot("faq-ready");

		await gotoPath("/agent/knowledge/files");
		const chooserPromise = page.waitForEvent("filechooser");
		await cinematicClick(
			page.locator(".od-page-title").getByRole("button", { name: "Add file" }),
			400,
		);
		const chooser = await chooserPromise;
		await chooser.setFiles(mockFilePath);
		await page.waitForFunction(
			() => document.body.innerText.includes("cordant-support-runbook.md"),
			null,
			{ timeout: 20_000 },
		);
		await pause(900);
		await shot("file-ready");
	}

	async function waitForWebSourceReady() {
		const deadline = Date.now() + 80_000;
		while (Date.now() < deadline) {
			const body = await page.locator("body").innerText();
			if (body.includes("Ready")) return;
			if (body.includes("Failed")) return;
			await pause(4000);
			await page.reload({ waitUntil: "domcontentloaded" });
			await ensureCursor();
		}
	}

	async function developerSetup() {
		await gotoPath("/settings/developers");
		const provisionedKey = await page.evaluate(async (origin) => {
			await fetch("/api/account/origins", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ origins: [origin] }),
			});
			const existing = await fetch("/api/account/keys")
				.then((response) => (response.ok ? response.json() : null))
				.catch(() => null);
			const hasPublicTestKey = existing?.keys?.some(
				(key) => key.type === "public" && key.mode === "test",
			);
			if (hasPublicTestKey) return "";
			const created = await fetch("/api/account/keys", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "Cordant demo widget",
					type: "public",
					mode: "test",
				}),
			}).then((response) => (response.ok ? response.json() : null));
			return created?.key?.rawKey || "";
		}, demoUser.origin);
		if (/pk_test_[0-9a-f]{64}/.test(provisionedKey)) {
			demoPublicKey = provisionedKey;
		}
		await page.reload({ waitUntil: "domcontentloaded" });
		await ensureCursor();
		await page
			.waitForFunction(
				() => !document.body.innerText.includes("Loading keys"),
				null,
				{ timeout: 20_000 },
			)
			.catch(() => {});
		await pause(900);
		await shot("developers-masked-keys");
		await gotoPath("/docs", 1200);
		await shot("docs");
	}

	async function demoAppTour() {
		await page.evaluate((key) => {
			window.localStorage.setItem("otter-demo-public-key", key);
			window.localStorage.setItem("otter-demo-fixtures", "true");
		}, demoPublicKey);
		await gotoPath("/demo", 1200);
		await shot("demo-home");
		for (const path of [
			"/demo/projects",
			"/demo/automation",
			"/demo/tickets",
			"/demo/settings/notifications",
			"/demo/admin",
		]) {
			await gotoPath(path, 900);
		}
		await gotoPath("/demo", 900);
	}

	async function openWidget() {
		await setDemoCursorVisible(false);
		const launcher = page.locator(
			'#otter-host button[aria-label="Open Otter"]',
		);
		await launcher.waitFor({ state: "visible", timeout: 20_000 });
		await launcher.click();
		await pause(800);
	}

	async function sendOtterMessage(message, options = {}) {
		const { wait = 75_000, allow = true } = options;
		await page.locator("#otter-host textarea").fill(message);
		await pause(350);
		await page.locator('#otter-host button[aria-label="Send"]').click();
		await pause(700);
		if (allow) await clickConsentIfShown();
		await waitForOtterIdle(wait);
	}

	async function clickConsentIfShown() {
		const deadline = Date.now() + 12_000;
		while (Date.now() < deadline) {
			const allow = page.locator("#otter-host .otter-card .otter-btn-primary");
			if ((await allow.count()) > 0) {
				await allow.click();
				await pause(600);
				return;
			}
			const textareaDisabled = await isWidgetBusy();
			if (!textareaDisabled) return;
			await pause(500);
		}
	}

	async function isWidgetBusy() {
		return page
			.locator("#otter-host textarea")
			.evaluate((el) => el.disabled)
			.catch(() => false);
	}

	async function waitForOtterIdle(timeout) {
		const deadline = Date.now() + timeout;
		while (Date.now() < deadline) {
			await clickConsentIfShown();
			const busy = await isWidgetBusy();
			const typing = await page
				.locator("#otter-host .otter-typing")
				.count()
				.catch(() => 0);
			if (!busy && typing === 0) {
				await pause(1000);
				return;
			}
			await pause(750);
		}
	}

	async function aiConversation() {
		await gotoPath("/demo", 900);
		await openWidget();
		await sendOtterMessage(
			"Before doing anything, what should I do if I forgot my password?",
			{ allow: false, wait: 45_000 },
		);
		await shot("widget-password-answer");
		await sendOtterMessage("Can you help me reset it?", { wait: 90_000 });
		await shot("widget-password-reset");

		await gotoPath("/demo", 700);
		await openWidget();
		await sendOtterMessage("I want to change my notification settings.", {
			wait: 90_000,
		});
		await shot("widget-notifications");

		await gotoPath("/demo", 700);
		await openWidget();
		await sendOtterMessage("Open project Apollo.", { wait: 90_000 });
		await shot("widget-apollo");

		await gotoPath("/demo/automation", 700);
		await openWidget();
		await sendOtterMessage(
			"Create a new automation named Route urgent billing tickets. Use Ticket created as the trigger, add one condition where Priority is Urgent, add one action to Add label billing, then create the rule.",
			{ wait: 120_000 },
		);
		await shot("widget-automation");

		await gotoPath("/demo", 700);
		await openWidget();
		await sendOtterMessage(
			"My name is Sarah and I always prefer email notifications.",
			{ allow: false, wait: 60_000 },
		);
		await pause(1200);
		await page.reload({ waitUntil: "domcontentloaded" });
		await pause(1200);
		await openWidget();
		await sendOtterMessage("What notification method do I prefer?", {
			allow: false,
			wait: 60_000,
		});
		await shot("widget-memory");
		await setDemoCursorVisible(true);
	}

	async function dashboardWrap() {
		await page.evaluate(() => {
			window.localStorage.setItem("otter-demo-fixtures", "true");
		});
		await gotoPath("/dashboard", 1200);
		await shot("dashboard-sessions");
		await gotoPath("/agent/knowledge/web-sources", 1000);
		await shot("dashboard-knowledge");
		await gotoPath("/settings/plan", 1000);
		await shot("dashboard-usage");
		await gotoPath("/dashboard", 1300);
	}

	try {
		await signUp();
		await organizationAndWebsite();
		await agentOnboarding();
		await configureAgentPages();
		await addKnowledge();
		await developerSetup();
		await demoAppTour();
		await aiConversation();
		await dashboardWrap();
		await pause(2500);
	} finally {
		const rawVideoPath = await page.video()?.path();
		await context.close();
		await browser.close();

		let mp4Path = "";
		if (rawVideoPath && existsSync(rawVideoPath)) {
			mp4Path = join(videoDir, "otter-product-demo.mp4");
			try {
				execFileSync(
					"ffmpeg",
					[
						"-y",
						"-i",
						rawVideoPath,
						"-vf",
						"fps=30,format=yuv420p",
						"-movflags",
						"+faststart",
						"-c:v",
						"libx264",
						"-preset",
						"slow",
						"-crf",
						"18",
						mp4Path,
					],
					{ stdio: "pipe" },
				);
			} catch (_error) {
				console.warn(
					"[demo] ffmpeg conversion failed; WebM is still available.",
				);
			}
		}

		writeFileSync(
			summaryPath,
			JSON.stringify(
				{
					baseUrl,
					user: { name: demoUser.name, email: demoUser.email },
					artifactDir,
					video: {
						webm: rawVideoPath || null,
						mp4: mp4Path || null,
					},
					screenshots,
					mockData: [mockFilePath],
				},
				null,
				2,
			),
		);
		console.log(
			JSON.stringify(
				{ artifactDir, videoDir, screenshots, summaryPath },
				null,
				2,
			),
		);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
