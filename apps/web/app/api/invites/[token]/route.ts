import { proxyToOtterApi } from "@/lib/otter-api-proxy";

type RouteContext = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export async function GET(
	request: Request,
	context: RouteContext,
): Promise<Response> {
	const { token } = await context.params;
	return proxyToOtterApi(request, `/api/invites/${token}`);
}
