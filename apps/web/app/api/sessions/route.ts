import { listSessions } from "otto-core";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
	return Response.json({ sessions: listSessions(50) });
}
