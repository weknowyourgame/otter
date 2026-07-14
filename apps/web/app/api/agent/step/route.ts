import { proxyToOttoApi } from "@/lib/otto-api-proxy";

export function POST(request: Request): Promise<Response> {
	return proxyToOttoApi(request, "/step");
}

export function OPTIONS(request: Request): Promise<Response> {
	return proxyToOttoApi(request, "/step");
}
