import { proxyToOtterApi } from "@/lib/otter-api-proxy";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
	return proxyToOtterApi(request, "/sessions");
}
