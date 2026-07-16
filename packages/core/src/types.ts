// The wire protocol between the Otto SDK (eyes + hands, in the browser)
// and this engine (the brain, on the server). The SDK serializes the page,
// the engine answers with exactly one next action, and the SDK executes it
// and reports back — one POST per step until `done`, `say`, or `fail`.

import type { PauseStore } from "./safety.js";

export interface ElementState {
	disabled?: boolean;
	checked?: boolean;
	selected?: boolean;
	expanded?: boolean;
	value?: string;
}

export interface PageElement {
	/** Stable id the SDK stamps on the live node as data-otto-ref. */
	ref: number;
	/** button | link | textbox | checkbox | switch | select | tab | option | menuitem */
	role: string;
	/** Visible text / aria-label / placeholder, capped. */
	name: string;
	href?: string;
	state?: ElementState;
	inViewport?: boolean;
}

export interface PageSnapshot {
	url: string;
	path: string;
	title: string;
	headings: string[];
	elements: PageElement[];
}

export type AgentAction =
	| { type: "click"; ref: number }
	| { type: "fill"; ref: number; value: string }
	| { type: "navigate"; path: string }
	| { type: "scroll"; ref: number }
	| { type: "say"; text: string }
	| { type: "done"; summary: string }
	| { type: "fail"; reason: string };

export interface LastActionReport {
	ok: boolean;
	error?: string;
}

export interface StepRequestUser {
	email?: string;
	name?: string;
}

export interface StepRequest {
	sessionId?: string;
	/** Present when the user typed something new (starts or redirects the task). */
	message?: string;
	snapshot: PageSnapshot;
	lastAction?: LastActionReport;
	/**
	 * Session attribution, forwarded from OttoConfig.user by the SDK — it was
	 * already being sent (agent.ts's stepPayload includes it) but this type
	 * never declared it, so the server silently dropped it. Wiring it up now:
	 * `email` is the only identity Otto has for cross-session memory (Phase 9).
	 */
	user?: StepRequestUser;
}

export interface StepResponse {
	sessionId: string;
	action: AgentAction;
	/** Short present-tense line for the widget's step trail ("Opening security settings…"). */
	status?: string;
	/** Which planner produced the action. */
	source: "ai" | "local";
}

export interface EngineConfig {
	apiKey?: string;
	model?: string;
	maxSteps?: number;
	/** Tenant ownership attached by the authenticated API boundary. */
	tenantId?: string;
	/** API key used for this run, retained for audit and revocation tracing. */
	apiKeyId?: string;
	/** Optional — if omitted, sessions can never be paused. See safety.ts. */
	pauseStore?: PauseStore;
	/**
	 * Tenant-configured persona/behaviour instructions, appended after
	 * prompt.ts's BASE_SYSTEM_PROMPT — never a replacement, since the base
	 * prompt defines the tool-calling contract the whole engine depends on.
	 */
	systemPromptAddendum?: string;
	/** Overrides MAX_TOOL_RESOLUTION_ITERATIONS for this tenant's turns. */
	maxToolCallsPerTurn?: number;
	/** When true, /step refuses new turns with a fixed "agent is off" reply. */
	agentDisabled?: boolean;
}

// ---- session bookkeeping (also powers the dashboard) ----

export interface SessionEvent {
	at: number;
	kind: "user" | "agent" | "step" | "result";
	text: string;
}

export interface SessionSummary {
	id: string;
	createdAt: number;
	updatedAt: number;
	title: string;
	steps: number;
	source: "ai" | "local";
	state: "active" | "done" | "failed";
	events: SessionEvent[];
}
