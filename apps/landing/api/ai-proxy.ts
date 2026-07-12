import type { IncomingMessage, ServerResponse } from "node:http";
import { handleAIProposal } from "ai-proxy-core";

type ProxyPayload = { message?: unknown; elements?: unknown };

const readJson = async (req: IncomingMessage) => {
	const parsedBody = (req as IncomingMessage & { body?: unknown }).body;
	if (typeof parsedBody === "string") return JSON.parse(parsedBody);
	if (parsedBody && typeof parsedBody === "object") return parsedBody;

	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}

	if (chunks.length === 0) return {};
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const sendJson = (
	res: ServerResponse,
	statusCode: number,
	body: Record<string, unknown>,
) => {
	res.statusCode = statusCode;
	res.setHeader("content-type", "application/json; charset=utf-8");
	res.end(JSON.stringify(body));
};

export default async function handler(
	req: IncomingMessage,
	res: ServerResponse,
) {
	if (req.method !== "POST") {
		res.setHeader("allow", "POST");
		return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
	}

	let payload: ProxyPayload;
	try {
		payload = await readJson(req);
	} catch {
		return sendJson(res, 400, { ok: false, error: "invalid_json" });
	}

	const { status, body } = await handleAIProposal(
		payload.message,
		payload.elements,
		process.env.OPENROUTER_API_KEY,
	);
	return sendJson(res, status, body);
}
