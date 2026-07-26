// The loop: observe -> ask the engine -> consent-gate -> execute -> repeat.
// Survives full page reloads by persisting its state to sessionStorage
// right before a hard navigation and resuming on the next init().

import type { Executor } from "./executor.js";
import { findByRef, observe } from "./observe.js";
import { describeRisk, isSensitiveInput } from "./risk.js";
import type {
	AgentAction,
	ExecutionResult,
	ResolvedConfig,
	StepResponse,
} from "./types.js";
import type { Trail, WidgetUI } from "./ui.js";

const RESUME_KEY = "otter:resume";
const SOCKET_OPEN_TIMEOUT_MS = 3000;
const STEP_TIMEOUT_MS = 30000;

interface PendingSocketRequest {
	resolve: (value: StepResponse) => void;
	reject: (reason: Error) => void;
}

interface ResumeState {
	sessionId: string;
	consent: boolean;
	transcript: string;
	panelOpen: boolean;
}

export class AgentLoop {
	private sessionId: string | null = null;
	private consentGranted = false;
	private running = false;
	private stopped = false;
	private aborter: AbortController | null = null;
	private socket: WebSocket | null = null;
	private socketOpening: Promise<WebSocket> | null = null;
	private readonly pendingSocketRequests = new Map<
		string,
		PendingSocketRequest
	>();

	constructor(
		private config: ResolvedConfig,
		private ui: WidgetUI,
		private executor: Executor,
	) {}

	get isRunning(): boolean {
		return this.running;
	}

	stop(): void {
		if (!this.running) return;
		this.stopped = true;
		this.aborter?.abort();
		for (const pending of this.pendingSocketRequests.values()) {
			pending.reject(new Error("stopped"));
		}
		this.pendingSocketRequests.clear();
	}

	/** Entry point for a user message (typed or programmatic). */
	async start(message: string): Promise<void> {
		if (this.running) return;
		this.ui.user(message);
		await this.run(message, null, undefined);
	}

	/** Continue a task across a full page reload. */
	async resumeIfPending(): Promise<void> {
		const raw = sessionStorage.getItem(RESUME_KEY);
		if (!raw) return;
		sessionStorage.removeItem(RESUME_KEY);
		let state: ResumeState;
		try {
			state = JSON.parse(raw) as ResumeState;
		} catch {
			return;
		}
		this.sessionId = state.sessionId;
		this.consentGranted = state.consent;
		const liveTrail = this.ui.restoreTranscript(state.transcript);
		if (state.panelOpen) this.ui.open();
		// Give the destination page a beat to hydrate before observing.
		await new Promise((r) => setTimeout(r, 600));
		await this.run(undefined, liveTrail, { ok: true });
	}

	private persistForHardNav(): void {
		if (!this.sessionId) return;
		const state: ResumeState = {
			sessionId: this.sessionId,
			consent: this.consentGranted,
			transcript: this.ui.dumpTranscript(),
			panelOpen: this.ui.isOpen,
		};
		sessionStorage.setItem(RESUME_KEY, JSON.stringify(state));
	}

	private async run(
		message: string | undefined,
		trail: Trail | null,
		lastAction: ExecutionResult | undefined,
	): Promise<void> {
		this.running = true;
		this.stopped = false;
		this.ui.setBusy(true);
		let steps = trail?.count ?? 0;
		// Created lazily on the first real step, so pure Q&A turns never show
		// a trail box and the consent card lands before any step rows.
		const ensureTrail = (): Trail => {
			trail ??= this.ui.trail();
			return trail;
		};

		try {
			while (true) {
				if (this.stopped)
					return this.finish(
						trail,
						"stopped",
						"Stopped. Nothing else will be touched.",
					);

				this.ui.typing(steps === 0 && !lastAction);
				let resp: StepResponse;
				try {
					resp = await this.requestStep(message, lastAction);
				} catch {
					if (this.stopped)
						return this.finish(
							trail,
							"stopped",
							"Stopped. Nothing else will be touched.",
						);
					this.ui.typing(false);
					return this.finish(
						trail,
						"fail",
						"I couldn't reach the agent backend. Check your connection and try again.",
						true,
					);
				}
				this.ui.typing(false);
				message = undefined;
				lastAction = undefined;
				this.sessionId = resp.sessionId;

				const action = resp.action;

				if (action.type === "say") {
					trail?.finish("done");
					this.ui.agent(action.text);
					return;
				}
				if (action.type === "done") {
					this.finish(trail, "done", action.summary);
					return;
				}
				if (action.type === "fail") {
					this.finish(trail, "fail", action.reason, true);
					return;
				}

				// --- an executable action from here on ---

				if (!this.consentGranted) {
					const allowed = await this.ui.consent();
					if (!allowed) {
						return this.finish(
							trail,
							"stopped",
							"No problem — I won't touch anything. Ask me whenever you're ready.",
						);
					}
					this.consentGranted = true;
				}

				const risk = this.riskLabelFor(action);
				if (risk) {
					this.ui.pill(false);
					const approved = await this.ui.confirmDanger(risk);
					if (!approved) {
						return this.finish(
							trail,
							"stopped",
							"Skipped that step and stopped there — tell me how you'd like to proceed.",
						);
					}
				}

				if (this.stopped)
					return this.finish(
						trail,
						"stopped",
						"Stopped. Nothing else will be touched.",
					);

				steps += 1;
				if (steps > this.config.maxSteps) {
					return this.finish(
						trail,
						"fail",
						"I hit my safety cap on steps for one task. Rephrase or break it down and I'll keep going.",
						true,
					);
				}

				this.ui.pill(true, resp.status);
				const handle = ensureTrail().step(resp.status ?? defaultStatus(action));

				// A hard navigation unloads this page — save state so the loop
				// resumes on the other side.
				if (action.type === "navigate" || action.type === "click")
					this.persistForHardNav();

				const result = await this.executor.execute(action);
				handle.setDone(result.ok);

				if (result.hardNav && action.type === "navigate") {
					location.assign(action.path);
					return; // page is about to unload
				}
				if (result.hardNav) return; // click triggered a same-tab external load
				sessionStorage.removeItem(RESUME_KEY);

				lastAction = { ok: result.ok, error: result.error };
			}
		} finally {
			this.running = false;
			this.ui.setBusy(false);
			this.ui.pill(false);
			this.ui.typing(false);
		}
	}

	private finish(
		trail: Trail | null,
		kind: "done" | "fail" | "stopped",
		text: string,
		error = false,
	): void {
		trail?.finish(kind);
		this.ui.agent(text, { error });
		this.ui.pill(false);
	}

	private riskLabelFor(action: AgentAction): string | null {
		if (action.type === "click") {
			const el = findByRef(action.ref);
			if (!el) return null;
			return describeRisk(el, this.config.riskyWords);
		}
		if (action.type === "fill") {
			const el = findByRef(action.ref);
			if (!el) return null;
			if (isSensitiveInput(el)) return "fill a password field";
			return describeRisk(el, this.config.riskyWords);
		}
		return null;
	}

	private async requestStep(
		message: string | undefined,
		lastAction: ExecutionResult | undefined,
	): Promise<StepResponse> {
		if (this.config.wsEndpoint) {
			try {
				return await this.requestStepViaSocket(message, lastAction);
			} catch {
				// Socket unavailable or this turn failed on it — fall back to
				// HTTP for this call. The socket itself may still be usable for
				// the next turn (requestStepViaSocket reopens lazily).
			}
		}
		return this.requestStepViaHttp(message, lastAction);
	}

	private stepPayload(
		message: string | undefined,
		lastAction: ExecutionResult | undefined,
	) {
		return {
			sessionId: this.sessionId ?? undefined,
			message,
			snapshot: observe(),
			lastAction: lastAction
				? { ok: lastAction.ok, error: lastAction.error }
				: undefined,
			user: this.config.user,
		};
	}

	private async requestStepViaHttp(
		message: string | undefined,
		lastAction: ExecutionResult | undefined,
	): Promise<StepResponse> {
		this.aborter = new AbortController();
		const timeout = setTimeout(() => this.aborter?.abort(), STEP_TIMEOUT_MS);
		try {
			const url = new URL(`${this.config.endpoint}/step`, window.location.href);
			if (this.config.publicKey)
				url.searchParams.set("key", this.config.publicKey);
			const headers: Record<string, string> = {
				"content-type": "application/json",
			};
			if (this.config.publicKey) headers["x-otter-key"] = this.config.publicKey;
			const res = await fetch(url, {
				method: "POST",
				headers,
				signal: this.aborter.signal,
				body: JSON.stringify(this.stepPayload(message, lastAction)),
			});
			if (!res.ok) throw new Error(`step_http_${res.status}`);
			return (await res.json()) as StepResponse;
		} finally {
			clearTimeout(timeout);
			this.aborter = null;
		}
	}

	private async ensureSocket(): Promise<WebSocket> {
		if (this.socket && this.socket.readyState === WebSocket.OPEN)
			return this.socket;
		if (this.socketOpening) return this.socketOpening;

		const endpoint = this.config.wsEndpoint;
		if (!endpoint) throw new Error("no_ws_endpoint");
		const url = new URL(endpoint, window.location.href);
		if (this.config.publicKey)
			url.searchParams.set("key", this.config.publicKey);

		this.socketOpening = new Promise<WebSocket>((resolve, reject) => {
			const ws = new WebSocket(url);
			const timeout = setTimeout(() => {
				ws.close();
				reject(new Error("ws_open_timeout"));
			}, SOCKET_OPEN_TIMEOUT_MS);

			ws.addEventListener(
				"open",
				() => {
					clearTimeout(timeout);
					this.socket = ws;
					resolve(ws);
				},
				{ once: true },
			);
			ws.addEventListener(
				"error",
				() => {
					clearTimeout(timeout);
					reject(new Error("ws_error"));
				},
				{ once: true },
			);
			ws.addEventListener("message", (event) => this.onSocketMessage(event));
			ws.addEventListener("close", () => {
				if (this.socket === ws) this.socket = null;
				for (const pending of this.pendingSocketRequests.values()) {
					pending.reject(new Error("ws_closed"));
				}
				this.pendingSocketRequests.clear();
			});
		}).finally(() => {
			this.socketOpening = null;
		});

		return this.socketOpening;
	}

	private onSocketMessage(event: MessageEvent): void {
		let parsed: {
			type: string;
			requestId?: string;
			result?: StepResponse;
			error?: string;
		};
		try {
			parsed = JSON.parse(String(event.data));
		} catch {
			return;
		}
		if (!parsed.requestId) return;
		const pending = this.pendingSocketRequests.get(parsed.requestId);
		if (!pending) return;
		this.pendingSocketRequests.delete(parsed.requestId);

		if (parsed.type === "step_result" && parsed.result) {
			pending.resolve(parsed.result);
		} else {
			pending.reject(new Error(parsed.error ?? "ws_step_failed"));
		}
	}

	private async requestStepViaSocket(
		message: string | undefined,
		lastAction: ExecutionResult | undefined,
	): Promise<StepResponse> {
		const ws = await this.ensureSocket();
		const requestId = crypto.randomUUID();

		return new Promise<StepResponse>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingSocketRequests.delete(requestId);
				reject(new Error("ws_step_timeout"));
			}, STEP_TIMEOUT_MS);

			this.pendingSocketRequests.set(requestId, {
				resolve: (value) => {
					clearTimeout(timeout);
					resolve(value);
				},
				reject: (err) => {
					clearTimeout(timeout);
					reject(err);
				},
			});

			ws.send(
				JSON.stringify({
					type: "step",
					requestId,
					...this.stepPayload(message, lastAction),
				}),
			);
		});
	}
}

function defaultStatus(action: AgentAction): string {
	switch (action.type) {
		case "click":
			return "Clicking…";
		case "fill":
			return "Typing…";
		case "navigate":
			return "Navigating…";
		case "scroll":
			return "Showing you…";
		default:
			return "Working…";
	}
}
