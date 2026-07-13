import { requestNextAction, type ChatMessage } from "./llm.js";
import { localNextAction, type LocalPlannerState } from "./local.js";
import { SYSTEM_PROMPT, renderSnapshot } from "./prompt.js";
import type {
	AgentAction,
	EngineConfig,
	SessionEvent,
	SessionSummary,
	StepRequest,
	StepResponse,
} from "./types.js";

const SESSION_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_STEPS = 24;
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

interface Session {
	id: string;
	createdAt: number;
	updatedAt: number;
	title: string;
	steps: number;
	source: "ai" | "local";
	state: "active" | "done" | "failed";
	history: ChatMessage[];
	local?: LocalPlannerState;
	events: SessionEvent[];
}

const sessions = new Map<string, Session>();

function sweep(): void {
	const now = Date.now();
	for (const [id, s] of sessions) {
		if (now - s.updatedAt > SESSION_TTL_MS) sessions.delete(id);
	}
}

function newId(): string {
	const bytes = new Uint8Array(12);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function record(session: Session, kind: SessionEvent["kind"], text: string): void {
	session.events.push({ at: Date.now(), kind, text });
	if (session.events.length > 200) session.events.splice(0, session.events.length - 200);
}

/**
 * One turn of the agent loop. The SDK calls this every step: with `message`
 * when the user typed something, with `lastAction` after executing what we
 * returned last time. Always answers with exactly one next action.
 */
export async function runStep(req: StepRequest, config: EngineConfig = {}): Promise<StepResponse> {
	sweep();

	const apiKey = config.apiKey?.trim() || undefined;
	const model = config.model?.trim() || DEFAULT_MODEL;
	const maxSteps = config.maxSteps ?? DEFAULT_MAX_STEPS;

	let session = req.sessionId ? sessions.get(req.sessionId) : undefined;
	if (!session) {
		session = {
			id: newId(),
			createdAt: Date.now(),
			updatedAt: Date.now(),
			title: req.message?.slice(0, 80) ?? "Session",
			steps: 0,
			source: apiKey ? "ai" : "local",
			state: "active",
			history: [{ role: "system", content: SYSTEM_PROMPT }],
			events: [],
		};
		sessions.set(session.id, session);
	}
	session.updatedAt = Date.now();
	session.steps += 1;

	if (req.message) {
		session.state = "active";
		session.local = undefined; // a new request restarts the local planner
		record(session, "user", req.message);
	}

	if (session.steps > maxSteps) {
		session.state = "failed";
		const action: AgentAction = {
			type: "fail",
			reason: "I hit my step limit for one task — that usually means I'm going in circles. Mind rephrasing or narrowing it down?",
		};
		record(session, "result", action.reason);
		return { sessionId: session.id, action, source: session.source };
	}

	const response = apiKey
		? await aiStep(session, req, apiKey, model)
		: localStep(session, req);

	if (response.status) record(session, "step", response.status);
	if (response.action.type === "say") record(session, "agent", response.action.text);
	if (response.action.type === "done") {
		session.state = "done";
		record(session, "result", response.action.summary);
	}
	if (response.action.type === "fail") {
		session.state = "failed";
		record(session, "result", response.action.reason);
	}
	return response;
}

async function aiStep(
	session: Session,
	req: StepRequest,
	apiKey: string,
	model: string,
): Promise<StepResponse> {
	const snapshotText = renderSnapshot(req.snapshot);

	// Only the newest snapshot is worth tokens — blank out earlier ones.
	for (const msg of session.history) {
		if (msg.role === "tool" && msg.content.includes("PAGE ")) {
			msg.content = msg.content.split("\n")[0] + "\n(page state superseded)";
		}
		if (msg.role === "user" && msg.content.includes("ELEMENTS:")) {
			msg.content = msg.content.split("CURRENT PAGE STATE:")[0] + "(page state superseded)";
		}
	}

	const lastAssistant = [...session.history].reverse().find((m) => m.role === "assistant");
	const pendingCall = lastAssistant?.tool_calls?.[0];

	if (pendingCall && req.lastAction) {
		// Close the loop on the previous tool call with its result + new state.
		const outcome = req.lastAction.ok
			? "ok"
			: `error: ${req.lastAction.error ?? "action failed"}`;
		session.history.push({
			role: "tool",
			tool_call_id: pendingCall.id,
			content: `${outcome}\n\nPAGE ${req.snapshot.path}\n${snapshotText}`,
		});
		if (req.message) {
			session.history.push({ role: "user", content: req.message });
		}
	} else {
		// Fresh user turn (or a reply after say()).
		const text = req.message ?? "(continue)";
		session.history.push({
			role: "user",
			content: `${text}\n\nCURRENT PAGE STATE:\n${snapshotText}`,
		});
	}

	try {
		const step = await requestNextAction(session.history, apiKey, model);
		session.history.push(step.assistantMessage);
		return {
			sessionId: session.id,
			action: step.action,
			status: step.status,
			source: "ai",
		};
	} catch (err) {
		const reason = err instanceof Error ? err.message : "unknown";
		return {
			sessionId: session.id,
			action: {
				type: "fail",
				reason: `I couldn't reach my AI backend (${reason.split(":")[0]}). Try again in a moment.`,
			},
			source: "ai",
		};
	}
}

function localStep(session: Session, req: StepRequest): StepResponse {
	if (req.message || !session.local) {
		session.local = {
			query: req.message ?? session.title,
			visitedPaths: [],
			clickedRefsByPath: {},
			actionsTaken: 0,
		};
	}
	const { action, status } = localNextAction(session.local, req.snapshot);
	return { sessionId: session.id, action, status, source: "local" };
}

/** Recent sessions, newest first — powers the dashboard. */
export function listSessions(limit = 50): SessionSummary[] {
	sweep();
	return [...sessions.values()]
		.sort((a, b) => b.updatedAt - a.updatedAt)
		.slice(0, limit)
		.map(({ id, createdAt, updatedAt, title, steps, source, state, events }) => ({
			id,
			createdAt,
			updatedAt,
			title,
			steps,
			source,
			state,
			events,
		}));
}
