import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { handleAIProposal } from "ai-proxy-core";

// Lets `npm run dev` serve /api/ai-proxy directly, so the AI widget works
// with real AI locally without needing `vercel dev` or any extra tooling.
const aiProxyDevMiddleware = (apiKey: string | undefined): Plugin => ({
	name: "ai-proxy-dev-middleware",
	configureServer(server) {
		server.middlewares.use("/api/ai-proxy", async (req, res, next) => {
			if (req.method !== "POST") return next();
			try {
				const chunks: Buffer[] = [];
				for await (const chunk of req) {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
				}
				const payload = chunks.length
					? JSON.parse(Buffer.concat(chunks).toString("utf8"))
					: {};
				const { status, body } = await handleAIProposal(
					payload.message,
					payload.elements,
					apiKey,
				);
				res.statusCode = status;
				res.setHeader("content-type", "application/json; charset=utf-8");
				res.end(JSON.stringify(body));
			} catch {
				res.statusCode = 400;
				res.setHeader("content-type", "application/json; charset=utf-8");
				res.end(JSON.stringify({ ok: false, error: "invalid_request" }));
			}
		});
	},
});

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		plugins: [react(), aiProxyDevMiddleware(env.OPENROUTER_API_KEY)],
	};
});
