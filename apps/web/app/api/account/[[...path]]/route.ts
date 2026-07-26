import { proxyToOtterApi } from "@/lib/otter-api-proxy";

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handler(
	request: Request,
	context: RouteContext,
): Promise<Response> {
	const { path = [] } = await context.params;
	const suffix = path.length > 0 ? `/${path.join("/")}` : "";
	return proxyToOtterApi(request, `/api/account${suffix}`);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const OPTIONS = handler;
