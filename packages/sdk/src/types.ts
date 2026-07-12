export interface WidgetConfig {
	/**
	 * Where the widget POSTs { message, elements } and expects back
	 * { ok, targetId, action, reply }. Defaults to a same-origin relative
	 * path, which works if you embed the widget on the same domain as your
	 * backend. Point this at an absolute URL if the backend lives elsewhere
	 * (e.g. a shared internal AI proxy).
	 */
	proxyUrl?: string;
	/** Optional header name for a shared secret / tenant token sent with every proxy request. */
	authHeader?: string;
	/** Value sent in `authHeader`, if set. */
	authToken?: string;
	/** Bubble corner. Default "bottom-right". */
	position?: "bottom-right" | "bottom-left";
	/** Highlight border / accent color. Default "#7cf7c4". */
	accentColor?: string;
	/** Emoji or short text shown on the closed bubble. Default "💬". */
	bubbleIcon?: string;
	/** Chat panel header text. Default "Ask about this page". */
	title?: string;
	/** First assistant message shown when the panel is opened for the first time. */
	greeting?: string;
	/** Input placeholder text. Default "Ask a question…". */
	placeholder?: string;
	/** How long the highlight overlay stays before auto-fading, in ms. Default 5000. */
	highlightAutoClearMs?: number;
	/** Extra words that force risk: "high" on a matched element, merged with the built-in list. */
	riskyWords?: string[];
	/** Cap on how many DOM elements observe() will include. Default 200. */
	maxElements?: number;
	/** Timeout for the AI proxy request, in ms. Default 16000. */
	requestTimeoutMs?: number;
	/**
	 * Base URL of the guidance backend used for support-tool handoffs
	 * (`GET {guidanceBaseUrl}/api/guidance/handoffs/:token`). Defaults to
	 * same-origin (""). Set to e.g. "http://localhost:8787" when the backend
	 * lives on another origin.
	 */
	guidanceBaseUrl?: string;
	/**
	 * Logged-in customer email used only to poll the demo guidance delivery
	 * endpoint. The backend normalizes it; production integrations should use
	 * a backend-vouched, short-lived identity token instead.
	 */
	userEmail?: string;
	/**
	 * SPA hook: called instead of a full-page navigation when a handoff plan
	 * targets a different route. Resolve once your router has rendered the
	 * destination; the SDK then looks for the target element there.
	 */
	onNavigate?: (route: string) => Promise<void> | void;
}

export interface HandoffPlan {
	tenantId: string;
	intent: string;
	route: string;
	targetSelector: string;
	action: "scrollAndHighlight" | "click";
	risk: "low" | "medium" | "high";
	expiresAt: string;
}

export interface SnapshotElement {
	id: string;
	tag: string;
	text: string;
	role: string | null;
	ariaLabel: string | null;
	selector: string;
	visible: boolean;
	enabled: boolean;
	rect: { x: number; y: number; top: number; left: number; width: number; height: number };
	aiAction: string | null;
	aiSection: string | null;
	risk: "low" | "high";
}

export interface Snapshot {
	url: string;
	title: string;
	elements: SnapshotElement[];
}

export type WidgetAction =
	| { type: "scrollTo"; elementId: string }
	| { type: "highlight"; elementId: string }
	| { type: "scrollAndHighlight"; elementId: string }
	| { type: "click"; elementId: string };

export interface ProposeResult {
	matched: boolean;
	source: "ai" | "local";
	action?: WidgetAction;
	reply: string;
}

export interface WidgetInstance {
	observe(): Snapshot;
	proposeAction(userMessage: string): Promise<ProposeResult>;
	requestApproval(action: WidgetAction, replyText: string): void;
	/**
	 * Executes an action after approval. `click` is re-validated against the
	 * live DOM right before firing — an element flagged `risk: "high"`
	 * (payment, delete, submit, password, etc.) or that isn't a real
	 * button/link is never clicked, regardless of what proposed it; it's
	 * highlighted instead. This check cannot be disabled via config.
	 */
	executeAction(action: WidgetAction): void;
	scrollTo(elementId: string): void;
	highlight(elementId: string): void;
	clearHighlight(): void;
	/** Update the identity used for pending support handoff polling. */
	identify(email: string | undefined): void;
	/** Removes the widget from the page and tears down all listeners. */
	destroy(): void;
}
