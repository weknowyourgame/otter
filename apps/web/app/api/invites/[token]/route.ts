import { proxyToOttoApi } from "@/lib/otto-api-proxy";

type RouteContext = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export async function GET(
	request: Request,
	context: RouteContext,
): Promise<Response> {
	const { token } = await context.params;
	return proxyToOttoApi(request, `/api/invites/${token}`);
}
