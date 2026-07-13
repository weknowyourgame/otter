// The wire protocol between the Otto SDK (eyes + hands, in the browser)
// and this engine (the brain, on the server). The SDK serializes the page,
// the engine answers with exactly one next action, and the SDK executes it
// and reports back — one POST per step until `done`, `say`, or `fail`.

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

export interface StepRequest {
	sessionId?: string;
	/** Present when the user typed something new (starts or redirects the task). */
	message?: string;
	snapshot: PageSnapshot;
	lastAction?: LastActionReport;
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
