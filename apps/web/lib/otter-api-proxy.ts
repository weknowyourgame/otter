const DEFAULT_API_URL = "http://localhost:8787";

function normalizeApiBase(value: string): string {
	const trimmed = value.trim() || DEFAULT_API_URL;
	const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
		? trimmed
		: `http://${trimmed}`;
	return withProtocol.replace(/\/$/, "");
}

function targetUrl(request: Request, path: string): URL {
	const base = normalizeApiBase(process.env.OTTER_API_URL ?? DEFAULT_API_URL);
	const target = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
	target.search = new URL(request.url).search;
	return target;
}

export async function proxyToOtterApi(
	request: Request,
	path: string,
): Promise<Response> {
	const headers = new Headers(request.headers);
	headers.delete("connection");
	headers.delete("content-length");
	headers.delete("host");

	// Preserve an exact browser origin through same-origin Next.js forwarding.
	if (!headers.has("origin")) {
		const referer = headers.get("referer");
		if (referer) headers.set("origin", new URL(referer).origin);
	}

	const body = ["GET", "HEAD"].includes(request.method)
		? undefined
		: await request.arrayBuffer();

	try {
		const upstream = await fetch(targetUrl(request, path), {
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
		console.error(`[otter-web] API proxy failed for ${path}`, error);
		return Response.json(
			{
				error: "api_unavailable",
				detail: "Start the Otter API with `bun run api`.",
			},
			{ status: 503 },
		);
	}
}
