import { proxyToOttoApi } from "@/lib/otto-api-proxy";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(
	request: Request,
	context: RouteContext,
): Promise<Response> {
	const { path } = await context.params;
	return proxyToOttoApi(request, `/api/auth/${path.join("/")}`);
}

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
