export interface OttoUser {
	email?: string;
	name?: string;
}

export interface OttoConfig {
	/** Base URL of the agent backend; the SDK POSTs to `${endpoint}/step`. */
	endpoint?: string;
	/** Display name for the assistant. Default "Otto". */
	name?: string;
	/** Accent color (buttons, cursor, highlights). Default "#5B6CF9". */
	accent?: string;
	/** Widget theme. "auto" follows prefers-color-scheme. Default "dark". */
	theme?: "dark" | "light" | "auto";
	position?: "bottom-right" | "bottom-left";
	/** Logged-in user, forwarded to the backend for session attribution. */
	user?: OttoUser;
	/** Client-side hard cap on actions per task. Default 20. */
	maxSteps?: number;
	zIndex?: number;
	/** Extra phrases treated as destructive (always confirmed per-action). */
	riskyWords?: string[];
	/** Hide the "Powered by" footer. */
	hideBranding?: boolean;
}

export type ResolvedConfig = Required<Omit<OttoConfig, "user">> & { user: OttoUser };

export interface OttoInstance {
	open(): void;
	close(): void;
	/** Programmatically submit a request, as if the user typed it. */
	ask(message: string): void;
	destroy(): void;
}

// ---- mirror of the engine wire protocol (kept dependency-free) ----

export interface ElementState {
	disabled?: boolean;
	checked?: boolean;
	selected?: boolean;
	expanded?: boolean;
	value?: string;
}

export interface PageElement {
	ref: number;
	role: string;
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

export interface StepResponse {
	sessionId: string;
	action: AgentAction;
	status?: string;
	source: "ai" | "local";
}

export interface ExecutionResult {
	ok: boolean;
	error?: string;
	/** Set when the action is about to unload the page (full navigation). */
	hardNav?: boolean;
}
