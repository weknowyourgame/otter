const DEFAULT_API_URL = "http://localhost:8787";

function normalizeApiBase(value: string): string {
	const trimmed = value.trim() || DEFAULT_API_URL;
	const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
		? trimmed
		: `http://${trimmed}`;
	return withProtocol.replace(/\/$/, "");
}

function targetUrl(request: Request): URL {
	const base = normalizeApiBase(process.env.OTTER_API_URL ?? DEFAULT_API_URL);
	const target = new URL(`${base}/step`);
	target.search = new URL(request.url).search;
	return target;
}

async function proxyToOtterApi(request: Request): Promise<Response> {
	const headers = new Headers(request.headers);
	headers.delete("connection");
	headers.delete("content-length");
	headers.delete("host");

	if (!headers.has("origin")) {
		const referer = headers.get("referer");
		if (referer) headers.set("origin", new URL(referer).origin);
	}

	const body = ["GET", "HEAD"].includes(request.method)
		? undefined
		: await request.arrayBuffer();

	try {
		const upstream = await fetch(targetUrl(request), {
			method: request.method,
			headers,
			body,
			redirect: "manual",
		});
		return new Response(upstream.body, {
			status: upstream.status,
			statusText: upstream.statusText,
			headers: upstream.headers,
		});
	} catch (error) {
		console.error("[otter-demo] API proxy failed for /step", error);
		return Response.json(
			{
				error: "api_unavailable",
				detail: "Start the Otter API with `bun run api`.",
			},
			{ status: 503 },
		);
	}
}

export function POST(request: Request): Promise<Response> {
	return proxyToOtterApi(request);
}

export function OPTIONS(request: Request): Promise<Response> {
	return proxyToOtterApi(request);
}
