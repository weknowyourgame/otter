import { proxyToOttoApi } from "@/lib/otto-api-proxy";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
	return proxyToOttoApi(request, "/sessions");
}
