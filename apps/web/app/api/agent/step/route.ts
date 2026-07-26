import { proxyToOtterApi } from "@/lib/otter-api-proxy";

export function POST(request: Request): Promise<Response> {
	return proxyToOtterApi(request, "/step");
}

export function OPTIONS(request: Request): Promise<Response> {
	return proxyToOtterApi(request, "/step");
}
