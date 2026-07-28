// Realtime step socket. One connection per widget instance — the client
// sends a "step" message per turn (mirroring the old per-step POST body)
// and gets exactly one "step_result" back, correlated by requestId. This
// swaps the transport (persistent socket vs. a new HTTP connection every
// turn) without changing the request/response shape of the loop itself.
//
// Deliberately scoped: no cross-connection fan-out yet. Otter doesn't need
// "N viewers watch one conversation" until the dashboard grows a live
// per-session viewer. Add that layer when there's an actual second subscriber
// to fan out to.

import { type EngineConfig, runStep } from "otter-core";
import { wsStepMessageSchema } from "./schemas.js";

export async function handleSocketMessage(raw: string, engineConfig: EngineConfig): Promise<string> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return JSON.stringify({ type: "error", error: "invalid_json" });
	}

	const result = wsStepMessageSchema.safeParse(parsed);
	if (!result.success) {
		return JSON.stringify({ type: "error", error: "invalid_message", detail: result.error.issues });
	}
	const message = result.data;

	try {
		const stepResult = await runStep(
			{
				sessionId: message.sessionId,
				message: message.message,
				snapshot: message.snapshot,
				lastAction: message.lastAction,
				user: message.user,
			},
			engineConfig,
		);
		return JSON.stringify({ type: "step_result", requestId: message.requestId, result: stepResult });
	} catch (err) {
		const reason = err instanceof Error ? err.message : "unknown";
		return JSON.stringify({ type: "error", requestId: message.requestId, error: reason });
	}
}
