import type {
	ProposeResult,
	Snapshot,
	SnapshotElement,
	WidgetAction,
	WidgetConfig,
	WidgetInstance,
} from "./types.js";

const DEFAULT_RISKY_WORDS = [
	"delete",
	"remove",
	"cancel subscription",
	"checkout",
	"payment",
	"billing",
	"password",
	"submit",
	"confirm",
	"purchase",
	"account deletion",
];

// Generic query-scaffolding words stripped before matching, so a message
// like "where is your pricing page?" reduces to meaningful content tokens
// ("pricing", "page") instead of matching everything.
const STOPWORDS = new Set([
	"the",
	"a",
	"an",
	"is",
	"are",
	"was",
	"were",
	"do",
	"does",
	"did",
	"i",
	"you",
	"your",
	"my",
	"me",
	"can",
	"could",
	"would",
	"should",
	"how",
	"what",
	"where",
	"when",
	"who",
	"why",
	"and",
	"or",
	"to",
	"of",
	"in",
	"on",
	"for",
	"about",
	"this",
	"that",
	"want",
	"need",
	"please",
	"tell",
	"show",
	"find",
	"get",
	"with",
]);

const CANDIDATE_SELECTOR =
	"button, a, input, textarea, select, section, h1, h2, h3, h4, h5, h6, [data-ai-action], [data-ai-section]";

let activeInstance: WidgetInstance | null = null;

export function init(userConfig: WidgetConfig = {}): WidgetInstance {
	if (activeInstance) {
		console.warn("[ai-widget-sdk] init() called while already active — reusing existing instance.");
		return activeInstance;
	}

	const config: Required<WidgetConfig> = {
		proxyUrl: userConfig.proxyUrl ?? "/api/ai-proxy",
		authHeader: userConfig.authHeader ?? "",
		authToken: userConfig.authToken ?? "",
		position: userConfig.position ?? "bottom-right",
		accentColor: userConfig.accentColor ?? "#7cf7c4",
		bubbleIcon: userConfig.bubbleIcon ?? "💬",
		title: userConfig.title ?? "Ask about this page",
		greeting:
			userConfig.greeting ??
			"Hi! Ask me where something is on this page — I'll always ask before touching anything.",
		placeholder: userConfig.placeholder ?? "Ask a question…",
		highlightAutoClearMs: userConfig.highlightAutoClearMs ?? 5000,
		riskyWords: [...DEFAULT_RISKY_WORDS, ...(userConfig.riskyWords ?? [])],
		maxElements: userConfig.maxElements ?? 200,
		requestTimeoutMs: userConfig.requestTimeoutMs ?? 16000,
	};

	const HOST_ID = "ai-widget-sdk-host";

	// id -> live HTMLElement, rebuilt on every observe()
	let elementMap = new Map<string, HTMLElement>();
	// id -> { risk, clickable }, rebuilt on every observe() — the source of
	// truth executeAction() re-checks against right before ever clicking.
	let elementMeta = new Map<string, { risk: "low" | "high"; clickable: boolean }>();
	// element -> id, kept across observe() calls so ids stay stable per element
	const elementIdByNode = new WeakMap<HTMLElement, string>();
	let idCounter = 0;
	let lastSnapshot: Snapshot | null = null;

	let highlightBoxEl: HTMLDivElement | null = null;
	let highlightTarget: HTMLElement | null = null;
	let highlightTimer: number | null = null;

	// -----------------------------------------------------------------
	// observe(): simplified Nanobrowser-style DOM snapshot
	// -----------------------------------------------------------------

	function isVisible(el: HTMLElement): boolean {
		const style = getComputedStyle(el);
		if (style.display === "none" || style.visibility === "hidden") return false;
		if (Number.parseFloat(style.opacity) === 0) return false;
		const rect = el.getBoundingClientRect();
		return rect.width > 0 && rect.height > 0;
	}

	function isEnabled(el: HTMLElement): boolean {
		if ("disabled" in el && (el as HTMLInputElement).disabled) return false;
		if (el.getAttribute("aria-disabled") === "true") return false;
		return true;
	}

	function getElementText(el: HTMLElement): string {
		let text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
		if (!text) {
			text = el.getAttribute("placeholder") || el.getAttribute("value") || "";
		}
		return text.slice(0, 120);
	}

	function buildSelector(el: HTMLElement): string {
		if (el.id) return "#" + CSS.escape(el.id);
		const parts: string[] = [];
		let node: HTMLElement | null = el;
		let depth = 0;
		while (node && node.nodeType === 1 && node !== document.body && depth < 5) {
			let part = node.tagName.toLowerCase();
			const cls = Array.from(node.classList || []).slice(0, 2);
			if (cls.length) part += "." + cls.map((c) => CSS.escape(c)).join(".");
			const parent: HTMLElement | null = node.parentElement;
			if (parent) {
				const siblings = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
				if (siblings.length > 1) {
					part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
				}
			}
			parts.unshift(part);
			node = parent;
			depth += 1;
		}
		return parts.join(" > ") || el.tagName.toLowerCase();
	}

	function computeRisk(text: string, selector: string, aiAction: string | null): "low" | "high" {
		const haystack = `${text} ${selector} ${aiAction || ""}`.toLowerCase();
		return config.riskyWords.some((word) => haystack.includes(word)) ? "high" : "low";
	}

	// A <button> defaults to type="submit" inside a <form> even with no
	// explicit type attribute — clicking it submits the form. Since form
	// intent (newsletter vs. payment vs. account deletion) can't be known
	// generically, any form-submit control is risk:"high" regardless of its
	// visible text, closing a gap the keyword list alone can't cover.
	function isFormSubmit(el: HTMLElement): boolean {
		const tag = el.tagName.toLowerCase();
		if (tag === "input" && (el as HTMLInputElement).type === "submit") return true;
		if (tag !== "button") return false;
		const type = (el.getAttribute("type") || "submit").toLowerCase();
		return type === "submit" && el.closest("form") !== null;
	}

	function isClickableTag(el: HTMLElement, aiAction: string | null): boolean {
		const tag = el.tagName.toLowerCase();
		if (tag === "a" || tag === "button") return true;
		if (el.getAttribute("role") === "button") return true;
		return Boolean(aiAction);
	}

	function getElementId(el: HTMLElement): string {
		const existing = elementIdByNode.get(el);
		if (existing) return existing;
		idCounter += 1;
		const id = "el_" + idCounter;
		elementIdByNode.set(el, id);
		return id;
	}

	function observe(): Snapshot {
		elementMap = new Map();
		elementMeta = new Map();
		const results: SnapshotElement[] = [];
		const hostEl = document.getElementById(HOST_ID);
		const nodes = document.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR);

		for (const el of nodes) {
			if (results.length >= config.maxElements) break;
			if (!(el instanceof HTMLElement)) continue;
			if (hostEl && hostEl.contains(el)) continue; // never observe our own UI
			if (!isVisible(el)) continue;

			const id = getElementId(el);
			elementMap.set(id, el);

			const rect = el.getBoundingClientRect();
			const text = getElementText(el);
			const selector = buildSelector(el);
			const aiAction = el.getAttribute("data-ai-action");
			const aiSection = el.getAttribute("data-ai-section");
			const risk: "low" | "high" =
				computeRisk(text, selector, aiAction) === "high" || isFormSubmit(el) ? "high" : "low";
			elementMeta.set(id, { risk, clickable: isClickableTag(el, aiAction) });

			results.push({
				id,
				tag: el.tagName.toLowerCase(),
				text,
				role: el.getAttribute("role") || null,
				ariaLabel: el.getAttribute("aria-label") || null,
				selector,
				visible: true,
				enabled: isEnabled(el),
				rect: {
					x: rect.x,
					y: rect.y,
					top: rect.top,
					left: rect.left,
					width: rect.width,
					height: rect.height,
				},
				aiAction: aiAction || null,
				aiSection: aiSection || null,
				risk,
			});
		}

		lastSnapshot = { url: location.href, title: document.title, elements: results };
		return lastSnapshot;
	}

	// -----------------------------------------------------------------
	// proposeAction(): real AI first, generic local matcher as fallback
	// -----------------------------------------------------------------

	function tokenize(message: string): string[] {
		return message
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, " ")
			.split(/\s+/)
			.filter((w) => w.length >= 3 && !STOPWORDS.has(w));
	}

	// Generic keyword-overlap scorer: no hardcoded intents, so it works on
	// any site's real content out of the box. data-ai-section/data-ai-action
	// tags (explicit developer signals) are weighted higher than free text.
	function scoreElement(tokens: string[], el: SnapshotElement): number {
		const text = el.text.toLowerCase();
		const aria = (el.ariaLabel || "").toLowerCase();
		const section = (el.aiSection || "").toLowerCase();
		const action = (el.aiAction || "").toLowerCase().replace(/-/g, " ");
		let score = 0;
		for (const token of tokens) {
			if (section && section.includes(token)) score += 3;
			if (action && action.includes(token)) score += 3;
			if (text.includes(token)) score += 1;
			if (aria.includes(token)) score += 1;
		}
		return score;
	}

	// Words implying the user wants to *go to*/*open* something, vs. just
	// asking where it is. Only ever biases toward proposing "click" —
	// resolveFinalActionType() below still has the final say on whether a
	// click is actually safe to fire.
	const NAVIGATION_PHRASES = ["take me to", "go to", "navigate to", "open ", "click "];
	function wantsNavigation(userMessage: string): boolean {
		const msg = ` ${userMessage.toLowerCase()} `;
		return NAVIGATION_PHRASES.some((phrase) => msg.includes(phrase));
	}

	type Candidate = { elementId: string; actionType: "click" | "scrollAndHighlight"; reply: string };

	function localPropose(userMessage: string, elements: SnapshotElement[]): Candidate | null {
		const tokens = tokenize(userMessage);
		if (!tokens.length) return null;

		let best: SnapshotElement | null = null;
		let bestScore = 0;
		for (const el of elements) {
			const score = scoreElement(tokens, el);
			if (score > bestScore) {
				bestScore = score;
				best = el;
			}
		}
		if (!best) return null;

		const label = best.aiSection || (best.aiAction || "").replace(/-/g, " ") || best.text || best.tag;
		const actionType = wantsNavigation(userMessage) ? "click" : "scrollAndHighlight";
		const verb = actionType === "click" ? "open" : "show";
		return { elementId: best.id, actionType, reply: `I found "${label}" on this page. Want me to ${verb} it?` };
	}

	async function tryAIPropose(
		userMessage: string,
		elements: Partial<SnapshotElement>[],
	): Promise<{ ok: boolean; targetId?: string | null; action?: string; reply?: string } | null> {
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
			const headers: Record<string, string> = { "content-type": "application/json" };
			if (config.authHeader && config.authToken) headers[config.authHeader] = config.authToken;
			const res = await fetch(config.proxyUrl, {
				method: "POST",
				headers,
				body: JSON.stringify({ message: userMessage, elements }),
				signal: controller.signal,
			});
			clearTimeout(timer);
			if (!res.ok) return null;
			return await res.json();
		} catch {
			return null; // no backend reachable — fall back locally
		}
	}

	// The AI (or local matcher) only ever *proposes* an action type. This is
	// the one place that decides what's actually safe to execute — it can
	// downgrade click -> scrollAndHighlight, but never the reverse, and
	// nothing upstream of this can override it.
	function resolveFinalActionType(
		elementId: string,
		desired: "click" | "scrollAndHighlight",
	): { type: "click" | "scrollAndHighlight"; downgradedForRisk: boolean } {
		if (desired !== "click") return { type: "scrollAndHighlight", downgradedForRisk: false };
		const meta = elementMeta.get(elementId);
		if (!meta || !meta.clickable) return { type: "scrollAndHighlight", downgradedForRisk: false };
		if (meta.risk === "high") return { type: "scrollAndHighlight", downgradedForRisk: true };
		return { type: "click", downgradedForRisk: false };
	}

	async function proposeAction(userMessage: string): Promise<ProposeResult> {
		const snapshot = observe();
		const elementsForAI = snapshot.elements.map((e) => ({
			id: e.id,
			tag: e.tag,
			text: e.text,
			role: e.role,
			ariaLabel: e.ariaLabel,
			aiAction: e.aiAction,
			aiSection: e.aiSection,
		}));

		const ai = await tryAIPropose(userMessage, elementsForAI);
		let candidate: Candidate | null = null;
		let source: "ai" | "local" = "local";

		if (
			ai &&
			ai.ok &&
			ai.targetId &&
			elementMap.has(ai.targetId) &&
			(ai.action === "scrollAndHighlight" || ai.action === "click")
		) {
			candidate = {
				elementId: ai.targetId,
				actionType: ai.action,
				reply: ai.reply || "I found something that matches. Want me to show it?",
			};
			source = "ai";
		}

		if (!candidate) {
			candidate = localPropose(userMessage, snapshot.elements);
			source = "local";
		}

		if (!candidate) {
			return {
				matched: false,
				source: ai && ai.ok ? "ai" : "local",
				reply: (ai && ai.ok && ai.reply) || "I couldn't find anything on this page matching that.",
			};
		}

		const resolved = resolveFinalActionType(candidate.elementId, candidate.actionType);
		const reply = resolved.downgradedForRisk
			? `${candidate.reply} (This looks like a sensitive action, so I'll only highlight it — not click it.)`
			: candidate.reply;

		return {
			matched: true,
			source,
			action: { type: resolved.type, elementId: candidate.elementId },
			reply,
		};
	}

	// -----------------------------------------------------------------
	// scrollTo / highlight / clearHighlight
	// -----------------------------------------------------------------

	function scrollTo(elementId: string): void {
		const el = elementMap.get(elementId);
		if (!el) return;
		el.scrollIntoView({ behavior: "smooth", block: "center" });
	}

	function positionHighlight(): void {
		if (!highlightTarget || !highlightBoxEl) return;
		const rect = highlightTarget.getBoundingClientRect();
		const pad = 6;
		highlightBoxEl.style.top = Math.max(rect.top - pad, 0) + "px";
		highlightBoxEl.style.left = Math.max(rect.left - pad, 0) + "px";
		highlightBoxEl.style.width = rect.width + pad * 2 + "px";
		highlightBoxEl.style.height = rect.height + pad * 2 + "px";
	}

	function handleHighlightEscape(event: KeyboardEvent): void {
		if (event.key === "Escape") clearHighlight();
	}

	function clearHighlight(): void {
		if (highlightTimer !== null) {
			window.clearTimeout(highlightTimer);
			highlightTimer = null;
		}
		if (highlightBoxEl) {
			highlightBoxEl.remove();
			highlightBoxEl = null;
		}
		highlightTarget = null;
		window.removeEventListener("scroll", positionHighlight, true);
		window.removeEventListener("resize", positionHighlight);
		document.removeEventListener("keydown", handleHighlightEscape);
	}

	function highlight(elementId: string): void {
		const el = elementMap.get(elementId);
		if (!el) return;
		clearHighlight();
		highlightTarget = el;
		const box = document.createElement("div");
		box.className = "aiw-highlight-box";
		shadowRoot.appendChild(box);
		highlightBoxEl = box;
		positionHighlight();
		window.addEventListener("scroll", positionHighlight, true);
		window.addEventListener("resize", positionHighlight);
		document.addEventListener("keydown", handleHighlightEscape);
		// Auto-dismiss so the dimmed overlay never lingers indefinitely.
		highlightTimer = window.setTimeout(() => {
			if (highlightBoxEl) highlightBoxEl.classList.add("aiw-highlight-fade");
			window.setTimeout(clearHighlight, 250);
		}, config.highlightAutoClearMs);
	}

	// Re-validates against the *current* live DOM right before firing —
	// never trusts the caller (AI, local matcher, or a direct executeAction()
	// call via the public bridge). Refuses and highlights instead when the
	// element is risky, not a real button/link, or has since become
	// disabled. This check cannot be bypassed via config.
	function clickElement(elementId: string): void {
		const el = elementMap.get(elementId);
		if (!el) return;
		const meta = elementMeta.get(elementId);
		const disabledNow =
			("disabled" in el && (el as HTMLButtonElement).disabled) ||
			el.getAttribute("aria-disabled") === "true";
		if (!meta || !meta.clickable || meta.risk === "high" || disabledNow) {
			console.warn(
				"[ai-widget-sdk] refused to click a risky, non-interactive, or disabled element — highlighting instead.",
			);
			highlight(elementId);
			return;
		}
		el.click();
	}

	// -----------------------------------------------------------------
	// executeAction(): the only place actions actually run, after approval
	// -----------------------------------------------------------------

	function executeAction(action: WidgetAction): void {
		if (!action) return;
		switch (action.type) {
			case "scrollTo":
				scrollTo(action.elementId);
				return;
			case "highlight":
				highlight(action.elementId);
				return;
			case "scrollAndHighlight":
				scrollTo(action.elementId);
				window.setTimeout(() => highlight(action.elementId), 450);
				return;
			case "click":
				scrollTo(action.elementId);
				window.setTimeout(() => clickElement(action.elementId), 450);
				return;
			default:
				console.warn("[ai-widget-sdk] unknown action type:", (action as WidgetAction).type);
		}
	}

	// -----------------------------------------------------------------
	// UI (Shadow DOM)
	// -----------------------------------------------------------------

	const hostEl = document.createElement("div");
	hostEl.id = HOST_ID;
	document.body.appendChild(hostEl);
	const shadowRoot = hostEl.attachShadow({ mode: "open" });

	const side = config.position === "bottom-left" ? "left" : "right";

	shadowRoot.innerHTML = `
		<style>
			:host { all: initial; }
			* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

			.aiw-bubble {
				position: fixed;
				bottom: 24px;
				${side}: 24px;
				width: 56px;
				height: 56px;
				border-radius: 50%;
				background: #111318;
				color: #fff;
				display: flex;
				align-items: center;
				justify-content: center;
				box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
				cursor: pointer;
				font-size: 22px;
				z-index: 2147483000;
				border: 1px solid rgba(255, 255, 255, 0.12);
			}
			.aiw-bubble:hover { background: #1b1e26; }
			[hidden] { display: none !important; }

			.aiw-panel {
				position: fixed;
				bottom: 92px;
				${side}: 24px;
				width: 340px;
				max-width: calc(100vw - 32px);
				max-height: 70vh;
				background: #14161c;
				color: #f5f5f7;
				border-radius: 16px;
				box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
				display: flex;
				flex-direction: column;
				overflow: hidden;
				font-size: 13px;
				z-index: 2147483000;
				border: 1px solid rgba(255, 255, 255, 0.08);
			}

			.aiw-header {
				padding: 14px 16px;
				display: flex;
				justify-content: space-between;
				align-items: center;
				border-bottom: 1px solid rgba(255, 255, 255, 0.08);
				font-weight: 600;
			}
			.aiw-close {
				background: none;
				border: none;
				color: rgba(255, 255, 255, 0.6);
				cursor: pointer;
				font-size: 16px;
				line-height: 1;
				padding: 4px;
			}
			.aiw-close:hover { color: #fff; }

			.aiw-messages {
				flex: 1;
				overflow-y: auto;
				padding: 12px 14px;
				display: flex;
				flex-direction: column;
				gap: 8px;
				min-height: 160px;
			}

			.aiw-msg {
				max-width: 88%;
				padding: 8px 12px;
				line-height: 1.4;
				border-radius: 12px;
			}
			.aiw-msg-user {
				align-self: flex-end;
				background: #2563eb;
				color: #fff;
				border-radius: 12px 12px 2px 12px;
			}
			.aiw-msg-assistant {
				align-self: flex-start;
				background: rgba(255, 255, 255, 0.08);
				border-radius: 12px 12px 12px 2px;
			}
			.aiw-typing { opacity: 0.6; }

			.aiw-approval {
				align-self: stretch;
				border: 1px solid rgba(255, 255, 255, 0.14);
				border-radius: 12px;
				padding: 10px 12px;
				display: flex;
				flex-direction: column;
				gap: 8px;
				background: rgba(255, 255, 255, 0.04);
			}
			.aiw-approval-label { margin: 0; font-weight: 600; }
			.aiw-approval-row { display: flex; gap: 8px; justify-content: flex-end; }
			.aiw-allow {
				background: #22c55e;
				color: #04240f;
				border: none;
				border-radius: 8px;
				padding: 6px 14px;
				cursor: pointer;
				font-weight: 600;
				font-size: 13px;
			}
			.aiw-allow:hover { background: #34d874; }
			.aiw-cancel {
				background: transparent;
				color: #f5f5f7;
				border: 1px solid rgba(255, 255, 255, 0.2);
				border-radius: 8px;
				padding: 6px 14px;
				cursor: pointer;
				font-size: 13px;
			}
			.aiw-cancel:hover { background: rgba(255, 255, 255, 0.06); }

			.aiw-input-row {
				display: flex;
				gap: 8px;
				padding: 10px 12px;
				border-top: 1px solid rgba(255, 255, 255, 0.08);
			}
			.aiw-input {
				flex: 1;
				background: rgba(255, 255, 255, 0.06);
				border: 1px solid rgba(255, 255, 255, 0.12);
				border-radius: 20px;
				padding: 8px 12px;
				color: #f5f5f7;
				outline: none;
				font-size: 13px;
				min-width: 0;
			}
			.aiw-input:focus { border-color: rgba(255, 255, 255, 0.3); }
			.aiw-send {
				background: #f5f5f7;
				color: #111318;
				border: none;
				border-radius: 20px;
				padding: 8px 16px;
				cursor: pointer;
				font-weight: 600;
				font-size: 13px;
			}
			.aiw-send:hover { background: #fff; }
			.aiw-send:disabled, .aiw-input:disabled { opacity: 0.6; cursor: not-allowed; }

			.aiw-highlight-box {
				position: fixed;
				z-index: 2147483000;
				pointer-events: none;
				border: 2px solid ${config.accentColor};
				border-radius: 10px;
				box-shadow: 0 0 0 9999px rgba(5, 5, 8, 0.55), 0 0 24px ${config.accentColor}59;
				opacity: 1;
				transition: top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease, opacity 0.25s ease;
			}
			.aiw-highlight-box.aiw-highlight-fade { opacity: 0; }
		</style>

		<div class="aiw-bubble" id="bubble" role="button" aria-label="Open support assistant">${config.bubbleIcon}</div>
		<div class="aiw-panel" id="panel" hidden>
			<div class="aiw-header">
				<span>${config.title}</span>
				<button type="button" class="aiw-close" id="close" aria-label="Close">✕</button>
			</div>
			<div class="aiw-messages" id="messages"></div>
			<form class="aiw-input-row" id="form">
				<input class="aiw-input" id="input" type="text" placeholder="${config.placeholder}" autocomplete="off" aria-label="Message" />
				<button class="aiw-send" id="send" type="submit">Send</button>
			</form>
		</div>
	`;

	const bubbleEl = shadowRoot.getElementById("bubble") as HTMLDivElement;
	const panelEl = shadowRoot.getElementById("panel") as HTMLDivElement;
	const closeEl = shadowRoot.getElementById("close") as HTMLButtonElement;
	const messagesEl = shadowRoot.getElementById("messages") as HTMLDivElement;
	const formEl = shadowRoot.getElementById("form") as HTMLFormElement;
	const inputEl = shadowRoot.getElementById("input") as HTMLInputElement;
	const sendBtnEl = shadowRoot.getElementById("send") as HTMLButtonElement;

	function addMessage(role: "user" | "assistant", text: string): void {
		const bubble = document.createElement("div");
		bubble.className = role === "user" ? "aiw-msg aiw-msg-user" : "aiw-msg aiw-msg-assistant";
		bubble.textContent = text;
		messagesEl.appendChild(bubble);
		messagesEl.scrollTop = messagesEl.scrollHeight;
	}

	function addTyping(): HTMLDivElement {
		const el = document.createElement("div");
		el.className = "aiw-msg aiw-msg-assistant aiw-typing";
		el.textContent = "…";
		messagesEl.appendChild(el);
		messagesEl.scrollTop = messagesEl.scrollHeight;
		return el;
	}

	function requestApproval(action: WidgetAction, replyText: string): void {
		addMessage("assistant", replyText);

		const card = document.createElement("div");
		card.className = "aiw-approval";

		const label = document.createElement("p");
		label.className = "aiw-approval-label";
		label.textContent = "Allow this action?";

		const row = document.createElement("div");
		row.className = "aiw-approval-row";

		const allowBtn = document.createElement("button");
		allowBtn.type = "button";
		allowBtn.className = "aiw-allow";
		allowBtn.textContent = "Allow";
		allowBtn.addEventListener("click", () => {
			card.remove();
			executeAction(action);
			const doneText =
				action.type === "click"
					? "Done — opened it."
					: "Done — scrolled to it and highlighted it on the page.";
			addMessage("assistant", doneText);
		});

		const cancelBtn = document.createElement("button");
		cancelBtn.type = "button";
		cancelBtn.className = "aiw-cancel";
		cancelBtn.textContent = "Cancel";
		cancelBtn.addEventListener("click", () => {
			card.remove();
			addMessage("assistant", "Okay, cancelled.");
		});

		row.appendChild(allowBtn);
		row.appendChild(cancelBtn);
		card.appendChild(label);
		card.appendChild(row);
		messagesEl.appendChild(card);
		messagesEl.scrollTop = messagesEl.scrollHeight;
	}

	async function handleUserMessage(): Promise<void> {
		const text = inputEl.value.trim();
		if (!text) return;
		inputEl.value = "";
		addMessage("user", text);

		inputEl.disabled = true;
		sendBtnEl.disabled = true;
		const typingEl = addTyping();

		let result: ProposeResult;
		try {
			result = await proposeAction(text);
		} finally {
			typingEl.remove();
			inputEl.disabled = false;
			sendBtnEl.disabled = false;
			inputEl.focus();
		}

		if (result.matched && result.action) {
			requestApproval(result.action, result.reply);
		} else {
			addMessage("assistant", result.reply);
		}
	}

	function onBubbleClick(): void {
		const wasHidden = panelEl.hidden;
		panelEl.hidden = !panelEl.hidden;
		if (wasHidden && messagesEl.children.length === 0) {
			addMessage("assistant", config.greeting);
		}
		if (!panelEl.hidden) inputEl.focus();
	}
	function onCloseClick(): void {
		panelEl.hidden = true;
	}
	function onFormSubmit(event: SubmitEvent): void {
		event.preventDefault();
		void handleUserMessage();
	}

	bubbleEl.addEventListener("click", onBubbleClick);
	closeEl.addEventListener("click", onCloseClick);
	formEl.addEventListener("submit", onFormSubmit);

	observe(); // warm the initial snapshot

	const instance: WidgetInstance = {
		observe,
		proposeAction,
		requestApproval,
		executeAction,
		scrollTo,
		highlight,
		clearHighlight,
		destroy() {
			clearHighlight();
			bubbleEl.removeEventListener("click", onBubbleClick);
			closeEl.removeEventListener("click", onCloseClick);
			formEl.removeEventListener("submit", onFormSubmit);
			hostEl.remove();
			activeInstance = null;
		},
	};

	activeInstance = instance;
	return instance;
}
