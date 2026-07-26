import {
	deleteExpiredSessions,
	getSession as getSessionRow,
	insertUsageEvent,
	listSessions as listSessionRows,
	type SessionRow,
	upsertSession,
} from "otter-db";
import {
	formatKnowledgeResultForModel,
	searchKnowledgeBase,
} from "./knowledge.js";
import { type ChatMessage, requestNextAction } from "./llm.js";
import { type LocalPlannerState, localNextAction } from "./local.js";
import {
	forgetFact,
	formatKnownFactsForPrompt,
	loadKnownFacts,
	rememberFact,
} from "./memory.js";
import { buildSystemPrompt, renderSnapshot } from "./prompt.js";
import type {
	AgentAction,
	EngineConfig,
	SessionEvent,
	SessionSummary,
	StepRequest,
	StepResponse,
} from "./types.js";

const SESSION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_MAX_STEPS = 24;
const DEFAULT_MODEL = "openai/gpt-5.3-codex";
const MAX_TOOL_RESOLUTION_ITERATIONS = 3;

interface Session {
	id: string;
	tenantId?: string;
	apiKeyId?: string;
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

/**
 * Sessions live in otter-db (Postgres via Bun's native SQL client) instead
 * of an in-memory Map, so they survive a server restart. otter-db's driver
 * is async (unlike the bun:sqlite driver this used before migrating off
 * SQLite), so runStep/listSessions are both async now — listSessions
 * becoming async is a real breaking change to callers of this package.
 */
function fromRow(row: SessionRow): Session {
	return {
		id: row.id,
		tenantId: row.tenantId ?? undefined,
		apiKeyId: row.apiKeyId ?? undefined,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		title: row.title,
		steps: row.steps,
		source: row.source,
		state: row.state,
		history: JSON.parse(row.history) as ChatMessage[],
		local: row.local ? (JSON.parse(row.local) as LocalPlannerState) : undefined,
		events: JSON.parse(row.events) as SessionEvent[],
	};
}

function maybeFromRow(row: SessionRow | undefined): Session | undefined {
	return row ? fromRow(row) : undefined;
}

function toRow(session: Session): Parameters<typeof upsertSession>[0] {
	return {
		id: session.id,
		tenantId: session.tenantId ?? null,
		apiKeyId: session.apiKeyId ?? null,
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
		title: session.title,
		steps: session.steps,
		source: session.source,
		state: session.state,
		history: JSON.stringify(session.history),
		local: session.local ? JSON.stringify(session.local) : null,
		events: JSON.stringify(session.events),
	};
}

async function sweep(): Promise<void> {
	await deleteExpiredSessions(Date.now() - SESSION_RETENTION_MS);
}

function newId(): string {
	const bytes = new Uint8Array(12);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function record(
	session: Session,
	kind: SessionEvent["kind"],
	text: string,
): void {
	session.events.push({ at: Date.now(), kind, text });
	if (session.events.length > 200)
		session.events.splice(0, session.events.length - 200);
}

/**
 * One turn of the agent loop. The SDK calls this every step: with `message`
 * when the user typed something, with `lastAction` after executing what we
 * returned last time. Always answers with exactly one next action.
 */
export async function runStep(
	req: StepRequest,
	config: EngineConfig = {},
): Promise<StepResponse> {
	await sweep();

	// Checked before touching session state at all — an in-flight session
	// someone paused from the dashboard shouldn't advance even one more step.
	// This is a backstop in addition to the SDK's client-side Stop button,
	// not a replacement for it: Stop must keep working even if this server
	// (or Redis, if config.pauseStore is backed by it) is unreachable.
	if (
		req.sessionId &&
		config.pauseStore &&
		(await config.pauseStore.isPaused(req.sessionId))
	) {
		return {
			sessionId: req.sessionId,
			action: {
				type: "say",
				text: "This session is paused right now. Ask again in a moment, or reach out if you need it resumed sooner.",
			},
			source: "ai",
		};
	}

	if (config.agentDisabled) {
		return {
			sessionId: req.sessionId ?? newId(),
			action: {
				type: "say",
				text: "This agent is currently turned off for this workspace.",
			},
			source: "ai",
		};
	}

	const apiKey = config.apiKey?.trim() || undefined;
	const model = config.model?.trim() || DEFAULT_MODEL;
	const maxSteps = config.maxSteps ?? DEFAULT_MAX_STEPS;
	const maxToolCallsPerTurn =
		config.maxToolCallsPerTurn ?? MAX_TOOL_RESOLUTION_ITERATIONS;

	const userKey = req.user?.email?.trim() || undefined;

	let session = req.sessionId
		? maybeFromRow(await getSessionRow(req.sessionId))
		: undefined;
	if (session && config.tenantId && session.tenantId !== config.tenantId) {
		throw new Error("session_not_found");
	}
	if (!session) {
		const history: ChatMessage[] = [
			{
				role: "system",
				content: buildSystemPrompt(
					Boolean(userKey),
					config.systemPromptAddendum,
				),
			},
		];
		if (userKey) {
			const facts = await loadKnownFacts(userKey, config.tenantId);
			if (facts.length > 0) {
				history.push({
					role: "system",
					content: formatKnownFactsForPrompt(facts),
				});
			}
		}
		session = {
			id: newId(),
			tenantId: config.tenantId,
			apiKeyId: config.apiKeyId,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			title: req.message?.slice(0, 80) ?? "Session",
			steps: 0,
			source: apiKey ? "ai" : "local",
			state: "active",
			history,
			events: [],
		};
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
			reason:
				"I hit my step limit for one task — that usually means I'm going in circles. Mind rephrasing or narrowing it down?",
		};
		record(session, "result", action.reason);
		await upsertSession(toRow(session));
		return { sessionId: session.id, action, source: session.source };
	}

	const response = apiKey
		? await aiStep(session, req, apiKey, model, userKey, maxToolCallsPerTurn)
		: localStep(session, req);

	if (response.status) record(session, "step", response.status);
	if (response.action.type === "say")
		record(session, "agent", response.action.text);
	if (response.action.type === "done") {
		session.state = "done";
		record(session, "result", response.action.summary);
	}
	if (response.action.type === "fail") {
		session.state = "failed";
		record(session, "result", response.action.reason);
	}
	await upsertSession(toRow(session));
	return response;
}

async function aiStep(
	session: Session,
	req: StepRequest,
	apiKey: string,
	model: string,
	userKey: string | undefined,
	maxToolCallsPerTurn: number,
): Promise<StepResponse> {
	const snapshotText = renderSnapshot(req.snapshot);

	// Only the newest snapshot is worth tokens — blank out earlier ones.
	for (const msg of session.history) {
		if (msg.role === "tool" && msg.content.includes("PAGE ")) {
			msg.content = `${msg.content.split("\n")[0]}\n(page state superseded)`;
		}
		if (msg.role === "user" && msg.content.includes("ELEMENTS:")) {
			msg.content = `${msg.content.split("CURRENT PAGE STATE:")[0]}(page state superseded)`;
		}
	}

	const lastAssistant = [...session.history]
		.reverse()
		.find((m) => m.role === "assistant");
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
		// search_knowledge_base/remember/forget all resolve server-side, inline:
		// the SDK never sees them, only the client-facing actions in
		// AgentAction. Bounded so a model that keeps calling tools can't loop
		// forever within one runStep().
		for (let iteration = 0; iteration < maxToolCallsPerTurn; iteration++) {
			const step = await requestNextAction(session.history, apiKey, model, {
				includeMemoryTools: Boolean(userKey),
			});
			session.history.push(step.assistantMessage);
			if (step.usage && session.tenantId) {
				void insertUsageEvent({
					id: newId(),
					tenantId: session.tenantId,
					kind: "agent_step",
					promptTokens: step.usage.promptTokens,
					completionTokens: step.usage.completionTokens,
					totalTokens: step.usage.totalTokens,
					createdAt: Date.now(),
				});
			}

			if (step.kind === "action") {
				return {
					sessionId: session.id,
					action: step.action,
					status: step.status,
					source: "ai",
				};
			}

			if (step.kind === "search") {
				const result = await searchKnowledgeBase(
					step.query,
					apiKey,
					session.tenantId,
				);
				session.history.push({
					role: "tool",
					tool_call_id: step.toolCallId,
					content: formatKnowledgeResultForModel(result),
				});
				continue;
			}

			if (step.kind === "remember") {
				// userKey is guaranteed here — the tool is only offered when it's set.
				const memory = await rememberFact(
					userKey as string,
					step.content,
					session.tenantId,
				);
				session.history.push({
					role: "tool",
					tool_call_id: step.toolCallId,
					content: `Remembered as [${memory.id}].`,
				});
				continue;
			}

			// step.kind === "forget"
			const deleted = await forgetFact(
				userKey as string,
				step.memoryId,
				session.tenantId,
			);
			session.history.push({
				role: "tool",
				tool_call_id: step.toolCallId,
				content: deleted
					? "Forgotten."
					: `No memory found with id [${step.memoryId}].`,
			});
		}

		return {
			sessionId: session.id,
			action: {
				type: "say",
				text: "I couldn't pin that down after a few tries — could you rephrase the question?",
			},
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

/** Recent sessions, newest first — powers the dashboard. Async now (was sync under bun:sqlite) — every caller needs an await added. */
export async function listSessions(
	limit = 50,
	tenantId?: string,
): Promise<SessionSummary[]> {
	await sweep();
	const rows = await listSessionRows(limit, tenantId);
	return rows.map(
		({ id, createdAt, updatedAt, title, steps, source, state, events }) => ({
			id,
			createdAt,
			updatedAt,
			title,
			steps,
			source,
			state,
			events: JSON.parse(events) as SessionEvent[],
		}),
	);
}
