// Realtime step socket. One connection per widget instance — the client
// sends a "step" message per turn (mirroring the old per-step POST body)
// and gets exactly one "step_result" back, correlated by requestId. This
// swaps the transport (persistent socket vs. a new HTTP connection every
// turn) without changing the request/response shape of the loop itself.
//
// Deliberately scoped: no cross-connection fan-out yet (Cossistant's
// connection-registry/realtime-pubsub split solves "N viewers watch one
// conversation," which Otto doesn't need until the dashboard grows a live
// per-session viewer). Add that layer when there's an actual second
// subscriber to fan out to.

import { type EngineConfig, runStep, type StepRequest } from "otto-core";

interface ClientStepMessage {
	type: "step";
	requestId: string;
	sessionId?: string;
	message?: string;
	snapshot: StepRequest["snapshot"];
	lastAction?: StepRequest["lastAction"];
	/** Was already silently dropped here too — same gap fixed for the HTTP route in Phase 9. */
	user?: StepRequest["user"];
}

type ClientMessage = ClientStepMessage;

const MAX_MESSAGE_TEXT_LENGTH = 4000;

function isClientStepMessage(value: unknown): value is ClientStepMessage {
	if (!value || typeof value !== "object") return false;
	const v = value as Record<string, unknown>;
	return (
		v.type === "step" &&
		typeof v.requestId === "string" &&
		!!v.snapshot &&
		typeof (v.snapshot as Record<string, unknown>).path === "string" &&
		Array.isArray((v.snapshot as Record<string, unknown>).elements)
	);
}

export async function handleSocketMessage(raw: string, engineConfig: EngineConfig): Promise<string> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return JSON.stringify({ type: "error", error: "invalid_json" });
	}

	if (!isClientStepMessage(parsed)) {
		return JSON.stringify({ type: "error", error: "invalid_message" });
	}

	if (typeof parsed.message === "string" && parsed.message.length > MAX_MESSAGE_TEXT_LENGTH) {
		parsed.message = parsed.message.slice(0, MAX_MESSAGE_TEXT_LENGTH);
	}

	try {
		const result = await runStep(
			{
				sessionId: parsed.sessionId,
				message: parsed.message,
				snapshot: parsed.snapshot,
				lastAction: parsed.lastAction,
				user: parsed.user,
			},
			engineConfig,
		);
		return JSON.stringify({ type: "step_result", requestId: parsed.requestId, result });
	} catch (err) {
		const reason = err instanceof Error ? err.message : "unknown";
		return JSON.stringify({ type: "error", requestId: parsed.requestId, error: reason });
	}
}
