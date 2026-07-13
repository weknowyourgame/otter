import { runStep, type StepRequest } from "otto-core";

// Demo-friendly CORS: the widget may be embedded on any origin. A production
// deployment scopes this by tenant API key instead of "*".
const CORS = {
	"access-control-allow-origin": "*",
	"access-control-allow-methods": "POST, OPTIONS",
	"access-control-allow-headers": "content-type",
};

export async function OPTIONS(): Promise<Response> {
	return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request): Promise<Response> {
	let body: StepRequest;
	try {
		body = (await req.json()) as StepRequest;
	} catch {
		return Response.json({ error: "invalid_json" }, { status: 400, headers: CORS });
	}

	if (!body?.snapshot || typeof body.snapshot.path !== "string" || !Array.isArray(body.snapshot.elements)) {
		return Response.json({ error: "missing_snapshot" }, { status: 400, headers: CORS });
	}
	if (typeof body.message === "string" && body.message.length > 4000) {
		body.message = body.message.slice(0, 4000);
	}

	const response = await runStep(body, {
		apiKey: process.env.OPENROUTER_API_KEY,
		model: process.env.AGENT_MODEL,
	});
	return Response.json(response, { headers: CORS });
}
