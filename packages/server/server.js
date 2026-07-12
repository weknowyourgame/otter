// Standalone local server for the AI support widget:
//   - serves ai-widget.js and a bookmarklet page as static files
//   - handles POST /api/ai-proxy (with CORS) so the widget gets real AI
//     matching on ANY site you inject it into, not just this one
//
// No dependencies beyond Node's built-ins (Node 18+ required for global fetch).

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleAIProposal } from "ai-proxy-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;

// ---------------------------------------------------------------------
// tiny .env loader (no dependency) — only sets vars not already set
// ---------------------------------------------------------------------
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


// ---------------------------------------------------------------------
// static files + bookmarklet page
// ---------------------------------------------------------------------

const WIDGET_DIST_PATH = path.join(__dirname, "..", "sdk", "dist", "ai-widget-sdk.global.js");
let WIDGET_JS;
try {
	WIDGET_JS = fs.readFileSync(WIDGET_DIST_PATH, "utf8");
} catch {
	console.error(
		`Could not find ${WIDGET_DIST_PATH} — run "npm run build" in packages/sdk first.`,
	);
	process.exit(1);
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

const server = http.createServer(async (req, res) => {
	const origin = `http://${req.headers.host}`;

	if (req.url === "/api/ai-proxy") {
		res.setHeader("access-control-allow-origin", "*");
		res.setHeader("access-control-allow-methods", "POST, OPTIONS");
		res.setHeader("access-control-allow-headers", "content-type");

		if (req.method === "OPTIONS") {
			res.statusCode = 204;
			res.end();
			return;
		}
		if (req.method !== "POST") {
			res.statusCode = 405;
			res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
			return;
		}

		const chunks = [];
		for await (const chunk of req) chunks.push(chunk);
		let payload = {};
		try {
			payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
		} catch {
			res.statusCode = 400;
			res.setHeader("content-type", "application/json");
			res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
			return;
		}

		const { status, body } = await handleAIProposal(
			payload.message,
			payload.elements,
			process.env.OPENROUTER_API_KEY,
		);
		res.statusCode = status;
		res.setHeader("content-type", "application/json; charset=utf-8");
		res.end(JSON.stringify(body));
		return;
	}

	if (req.url === "/ai-widget-sdk.js") {
		res.setHeader("content-type", "application/javascript; charset=utf-8");
		res.end(WIDGET_JS);
		return;
	}

	if (req.url === "/" || req.url === "/bookmarklet") {
		res.setHeader("content-type", "text/html; charset=utf-8");
		res.end(bookmarkletPage(origin));
		return;
	}

	res.statusCode = 404;
	res.end("Not found");
});

server.listen(PORT, () => {
	const aiConfigured = Boolean(process.env.OPENROUTER_API_KEY);
	console.log(`AI widget standalone server running at http://localhost:${PORT}`);
	console.log(`Open http://localhost:${PORT}/bookmarklet to get the bookmarklet.`);
	console.log(
		aiConfigured
			? "OPENROUTER_API_KEY found — real AI matching enabled."
			: "No OPENROUTER_API_KEY set — widget will fall back to local keyword matching only.",
	);
});
