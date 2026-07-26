import { proxyToOtterApi } from "@/lib/otter-api-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function DELETE(
	request: Request,
	context: RouteContext,
): Promise<Response> {
	const { id } = await context.params;
	return proxyToOtterApi(request, `/files/${id}`);
}
