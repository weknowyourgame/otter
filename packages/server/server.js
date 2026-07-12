// CLI entry for the guidance backend. All routing lives in lib/app.js so
// tests can start the identical server on an ephemeral port.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./lib/app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// tiny .env loader (no dependency) — only sets vars not already set
function loadEnvFile(filePath) {
	let content;
	try {
		content = fs.readFileSync(filePath, "utf8");
	} catch {
		return;
	}
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (!(key in process.env)) process.env[key] = value;
	}
}
loadEnvFile(path.join(__dirname, ".env"));

const { port } = await startServer({ port: Number(process.env.PORT) || 8787 });

console.log(`Guidance backend running at http://localhost:${port}`);
console.log(`Open http://localhost:${port}/bookmarklet to get the bookmarklet.`);
console.log(
	process.env.OPENROUTER_API_KEY
		? "OPENROUTER_API_KEY found — real AI matching enabled."
		: "No OPENROUTER_API_KEY set — widget falls back to local keyword matching.",
);
console.log(
	process.env.JIRA_AUTOMATION_SECRET
		? "JIRA_AUTOMATION_SECRET found — Jira Automation webhook enabled."
		: "No JIRA_AUTOMATION_SECRET set — Jira webhook will refuse all requests (503).",
);
console.log(
	`Handoff links point at DEMO_APP_URL=${process.env.DEMO_APP_URL || "http://localhost:3000 (default)"}`,
);
