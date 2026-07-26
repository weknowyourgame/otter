// Widget chrome: launcher, chat panel, step trail, consent/confirm cards,
// and the page-level "working" pill. Pure DOM in a shadow root — no
// framework, nothing leaks in or out.

import { HOST_ID } from "./observe.js";
import { buildStyles } from "./styles.js";
import type { ResolvedConfig } from "./types.js";

const GLYPH = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c.75 5.05 4.7 9 9.75 9.75-5.05.75-9 4.7-9.75 9.75-.75-5.05-4.7-9-9.75-9.75C7.3 11.2 11.25 7.25 12 2.2z"/></svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const ICON_NEW = `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`;
const ICON_SEND = `<svg viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>`;
const ICON_SHIELD = `<svg viewBox="0 0 24 24"><path d="M12 3l7.5 3v5.2c0 4.6-3.2 8.2-7.5 9.8-4.3-1.6-7.5-5.2-7.5-9.8V6L12 3z"/><path d="M9.2 12.2l2 2 3.6-4"/></svg>`;
const ICON_WARN = `<svg viewBox="0 0 24 24"><path d="M12 4L2.8 19.5h18.4L12 4z"/><path d="M12 10v4.2M12 17.2v.2"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const ICON_CROSS = `<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>`;
const ICON_CHEVRON = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"/></svg>`;
const SPINNER = `<svg class="otter-spinner" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/></svg>`;

export interface StepHandle {
	setDone(ok: boolean): void;
}

export interface Trail {
	step(status: string): StepHandle;
	finish(kind: "done" | "fail" | "stopped"): void;
	readonly count: number;
}

export interface UICallbacks {
	onSubmit(text: string): void;
	onStop(): void;
}

interface TranscriptEntry {
	kind: "user" | "agent" | "agent-error" | "trail";
	text?: string;
	steps?: Array<{ status: string; ok: boolean }>;
	finished?: "done" | "fail" | "stopped" | null;
}

export class WidgetUI {
	readonly shadow: ShadowRoot;
	private host: HTMLDivElement;
	private root: HTMLDivElement;
	private panel: HTMLElement;
	private messages: HTMLDivElement;
	private input: HTMLTextAreaElement;
	private sendBtn: HTMLButtonElement;
	private pillEl: HTMLDivElement;
	private pillStatus: HTMLSpanElement;
	private typingEl: HTMLDivElement | null = null;
	private themeQuery: MediaQueryList | null = null;
	private transcript: TranscriptEntry[] = [];

	constructor(
		private config: ResolvedConfig,
		private callbacks: UICallbacks,
	) {
		this.host = document.createElement("div");
		this.host.id = HOST_ID;
		document.body.appendChild(this.host);
		this.shadow = this.host.attachShadow({ mode: "open" });

		const style = document.createElement("style");
		style.textContent = buildStyles(
			config.accent,
			config.zIndex,
			config.position === "bottom-left" ? "left" : "right",
		);
		this.shadow.appendChild(style);

		this.root = document.createElement("div");
		this.root.className = "otter-root";
		this.root.innerHTML = `
			<button class="otter-launcher" type="button" aria-label="Open ${esc(config.name)}">${GLYPH}</button>
			<section class="otter-panel" data-open="false" role="dialog" aria-label="${esc(config.name)}">
				<header class="otter-header">
					<div class="otter-brand">
						<span class="otter-brand-dot">${GLYPH}</span>
						<div><h1>${esc(config.name)}</h1><p>AI support — it does it for you</p></div>
					</div>
					<div class="otter-header-actions">
						<button class="otter-icon-btn" type="button" data-act="new" aria-label="New conversation">${ICON_NEW}</button>
						<button class="otter-icon-btn" type="button" data-act="close" aria-label="Close">${ICON_CLOSE}</button>
					</div>
				</header>
				<div class="otter-messages"></div>
				<form class="otter-composer">
					<div class="otter-composer-box">
						<textarea class="otter-input" rows="1" placeholder="What do you need done?" aria-label="Message"></textarea>
						<button class="otter-send" type="submit" aria-label="Send" disabled>${ICON_SEND}</button>
					</div>
				</form>
				${config.hideBranding ? "" : `<footer class="otter-footer">${GLYPH}<span>Powered by ${esc(config.name)}</span></footer>`}
			</section>
			<div class="otter-pill" data-visible="false">
				<span class="otter-pill-dot"></span>
				<span class="otter-pill-status">${esc(config.name)} is working…</span>
				<span class="otter-pill-divider"></span>
				<button class="otter-pill-stop" type="button">Stop</button>
			</div>`;
		this.shadow.appendChild(this.root);

		this.panel = this.q(".otter-panel");
		this.messages = this.q(".otter-messages");
		this.input = this.q(".otter-input");
		this.sendBtn = this.q(".otter-send");
		this.pillEl = this.q(".otter-pill");
		this.pillStatus = this.q(".otter-pill-status");

		this.applyTheme();
		this.wire();
	}

	private q<T extends HTMLElement = HTMLElement>(sel: string): T {
		return this.root.querySelector(sel) as T;
	}

	private applyTheme(): void {
		const set = (t: "dark" | "light") => this.root.setAttribute("data-theme", t);
		if (this.config.theme === "auto") {
			this.themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
			set(this.themeQuery.matches ? "dark" : "light");
			this.themeQuery.addEventListener("change", (e) => set(e.matches ? "dark" : "light"));
		} else {
			set(this.config.theme);
		}
	}

	private wire(): void {
		this.q(".otter-launcher").addEventListener("click", () => this.toggle());
		this.q("[data-act='close']").addEventListener("click", () => this.close());
		this.q("[data-act='new']").addEventListener("click", () => this.reset());
		this.q(".otter-pill-stop").addEventListener("click", () => this.callbacks.onStop());

		const form = this.q(".otter-composer");
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			this.submit();
		});
		this.input.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.submit();
			}
			if (e.key === "Escape") this.close();
		});
		this.input.addEventListener("input", () => {
			this.sendBtn.disabled = !this.input.value.trim();
			this.input.style.height = "auto";
			this.input.style.height = `${Math.min(this.input.scrollHeight, 92)}px`;
		});
	}

	private submit(): void {
		const text = this.input.value.trim();
		if (!text) return;
		this.input.value = "";
		this.input.style.height = "auto";
		this.sendBtn.disabled = true;
		this.callbacks.onSubmit(text);
	}

	// ---------- panel state ----------

	get isOpen(): boolean {
		return this.panel.getAttribute("data-open") === "true";
	}

	open(): void {
		this.panel.setAttribute("data-open", "true");
		if (!this.messages.children.length) {
			this.agent(`Hi! I'm ${this.config.name}. Tell me what you need — I'll do it right here on the page.`, { record: false });
		}
		setTimeout(() => this.input.focus(), 120);
	}

	close(): void {
		this.panel.setAttribute("data-open", "false");
	}

	toggle(): void {
		this.isOpen ? this.close() : this.open();
	}

	private reset(): void {
		this.messages.innerHTML = "";
		this.transcript = [];
		this.agent(`Fresh start. What can I do for you?`, { record: false });
	}

	setBusy(busy: boolean): void {
		this.input.disabled = busy;
		if (!busy) {
			this.sendBtn.disabled = !this.input.value.trim();
			this.input.focus();
		} else {
			this.sendBtn.disabled = true;
		}
	}

	// ---------- messages ----------

	private scrollDown(): void {
		this.messages.scrollTop = this.messages.scrollHeight;
	}

	user(text: string, opts: { record?: boolean } = {}): void {
		const el = document.createElement("div");
		el.className = "otter-msg otter-msg-user";
		el.textContent = text;
		this.messages.appendChild(el);
		this.scrollDown();
		if (opts.record !== false) this.transcript.push({ kind: "user", text });
	}

	agent(text: string, opts: { error?: boolean; record?: boolean } = {}): void {
		const el = document.createElement("div");
		el.className = `otter-msg otter-msg-agent${opts.error ? " otter-msg-error" : ""}`;
		el.textContent = text;
		this.messages.appendChild(el);
		this.scrollDown();
		if (opts.record !== false) {
			this.transcript.push({ kind: opts.error ? "agent-error" : "agent", text });
		}
	}

	typing(show: boolean): void {
		if (show && !this.typingEl) {
			this.typingEl = document.createElement("div");
			this.typingEl.className = "otter-typing";
			this.typingEl.innerHTML = "<span></span><span></span><span></span>";
			this.messages.appendChild(this.typingEl);
			this.scrollDown();
		} else if (!show && this.typingEl) {
			this.typingEl.remove();
			this.typingEl = null;
		}
	}

	// ---------- step trail ----------

	trail(restored?: Array<{ status: string; ok: boolean }>): Trail {
		const entry: TranscriptEntry = { kind: "trail", steps: [...(restored ?? [])], finished: null };
		this.transcript.push(entry);

		const box = document.createElement("div");
		box.className = "otter-trail";
		box.innerHTML = `
			<button class="otter-trail-head" type="button">
				<span class="otter-check">${ICON_CHECK.replace("<svg ", '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" ')}</span>
				<span class="otter-trail-count"></span>
				<span class="otter-trail-chevron">${ICON_CHEVRON}</span>
			</button>
			<div class="otter-trail-steps"></div>`;
		this.messages.appendChild(box);
		const stepsEl = box.querySelector(".otter-trail-steps") as HTMLDivElement;
		const head = box.querySelector(".otter-trail-head") as HTMLButtonElement;
		head.addEventListener("click", () => {
			box.setAttribute("data-open", box.getAttribute("data-open") === "true" ? "false" : "true");
		});
		this.scrollDown();

		let count = 0;
		const addRow = (status: string): { row: HTMLDivElement; icon: HTMLSpanElement } => {
			count += 1;
			const row = document.createElement("div");
			row.className = "otter-step";
			row.setAttribute("data-state", "active");
			row.innerHTML = `<span class="otter-step-icon">${SPINNER}</span><span class="otter-step-text"></span>`;
			(row.querySelector(".otter-step-text") as HTMLElement).textContent = status;
			stepsEl.appendChild(row);
			this.scrollDown();
			return { row, icon: row.querySelector(".otter-step-icon") as HTMLSpanElement };
		};
		const setIcon = (icon: HTMLSpanElement, row: HTMLDivElement, ok: boolean) => {
			row.setAttribute("data-state", ok ? "done" : "error");
			icon.innerHTML = ok
				? `<span class="otter-check">${svgStroke(ICON_CHECK)}</span>`
				: `<span class="otter-cross">${svgStroke(ICON_CROSS)}</span>`;
		};

		for (const s of entry.steps ?? []) {
			const { row, icon } = addRow(s.status);
			setIcon(icon, row, s.ok);
		}

		const ui = this;
		return {
			get count() {
				return count;
			},
			step(status: string): StepHandle {
				const { row, icon } = addRow(status);
				const rec = { status, ok: true };
				entry.steps!.push(rec);
				ui.pillStatus.textContent = status;
				return {
					setDone(ok: boolean) {
						rec.ok = ok;
						setIcon(icon, row, ok);
					},
				};
			},
			finish(kind: "done" | "fail" | "stopped") {
				entry.finished = kind;
				if (count === 0) {
					box.remove();
					return;
				}
				box.setAttribute("data-finished", "true");
				head.setAttribute("data-kind", kind);
				const label =
					kind === "done"
						? `${count} step${count === 1 ? "" : "s"} completed`
						: kind === "stopped"
							? `Stopped after ${count} step${count === 1 ? "" : "s"}`
							: `Stopped — ${count} step${count === 1 ? "" : "s"} attempted`;
				(box.querySelector(".otter-trail-count") as HTMLElement).textContent = label;
				if (kind !== "done") {
					const check = box.querySelector(".otter-trail-head .otter-check") as HTMLElement;
					check.innerHTML = svgStroke(ICON_CROSS);
				}
				ui.scrollDown();
			},
		};
	}

	// ---------- cards ----------

	private card(opts: {
		danger?: boolean;
		icon: string;
		title: string;
		body: string;
		confirmLabel: string;
		denyLabel: string;
		resolvedText: string;
	}): Promise<boolean> {
		return new Promise((resolve) => {
			const el = document.createElement("div");
			el.className = "otter-card";
			if (opts.danger) el.setAttribute("data-danger", "true");
			el.innerHTML = `
				<div class="otter-card-title">${opts.icon}<span></span></div>
				<div class="otter-card-body"></div>
				<div class="otter-card-row">
					<button class="otter-btn otter-btn-ghost" type="button"></button>
					<button class="otter-btn ${opts.danger ? "otter-btn-danger" : "otter-btn-primary"}" type="button"></button>
				</div>`;
			(el.querySelector(".otter-card-title span") as HTMLElement).textContent = opts.title;
			(el.querySelector(".otter-card-body") as HTMLElement).textContent = opts.body;
			const deny = el.querySelector(".otter-btn-ghost") as HTMLButtonElement;
			const allow = el.querySelectorAll(".otter-btn")[1] as HTMLButtonElement;
			deny.textContent = opts.denyLabel;
			allow.textContent = opts.confirmLabel;

			const settle = (val: boolean) => {
				el.innerHTML = val
					? `<div class="otter-card-resolved"><span class="otter-check">${svgStroke(ICON_CHECK)}</span>${esc(opts.resolvedText)}</div>`
					: `<div class="otter-card-resolved">${esc(opts.denyLabel)} — nothing was touched.</div>`;
				resolve(val);
			};
			deny.addEventListener("click", () => settle(false));
			allow.addEventListener("click", () => settle(true));
			this.messages.appendChild(el);
			this.scrollDown();
		});
	}

	consent(): Promise<boolean> {
		return this.card({
			icon: ICON_SHIELD,
			title: `${this.config.name} wants to act on this page`,
			body: "It will click and type for you, showing every step as it goes. You can stop it at any time.",
			confirmLabel: "Allow",
			denyLabel: "Deny",
			resolvedText: "Allowed for this conversation",
		});
	}

	confirmDanger(label: string): Promise<boolean> {
		return this.card({
			danger: true,
			icon: ICON_WARN,
			title: "This step needs your OK",
			body: `The next action is "${label}" — it may be hard to undo, so I want your explicit go-ahead.`,
			confirmLabel: "Proceed",
			denyLabel: "Skip it",
			resolvedText: "Approved",
		});
	}

	// ---------- working pill ----------

	pill(show: boolean, status?: string): void {
		if (status) this.pillStatus.textContent = status;
		else if (show) this.pillStatus.textContent = `${this.config.name} is working…`;
		this.pillEl.setAttribute("data-visible", show ? "true" : "false");
	}

	// ---------- hard-nav persistence ----------

	dumpTranscript(): string {
		return JSON.stringify(this.transcript.slice(-40));
	}

	restoreTranscript(json: string): Trail | null {
		let entries: TranscriptEntry[];
		try {
			entries = JSON.parse(json) as TranscriptEntry[];
		} catch {
			return null;
		}
		this.messages.innerHTML = "";
		this.transcript = [];
		let liveTrail: Trail | null = null;
		for (let i = 0; i < entries.length; i++) {
			const e = entries[i];
			if (e.kind === "user") this.user(e.text ?? "");
			else if (e.kind === "agent") this.agent(e.text ?? "");
			else if (e.kind === "agent-error") this.agent(e.text ?? "", { error: true });
			else if (e.kind === "trail") {
				const t = this.trail(e.steps ?? []);
				if (e.finished) t.finish(e.finished);
				else if (i === entries.length - 1) liveTrail = t;
				else t.finish("done");
			}
		}
		return liveTrail;
	}

	destroy(): void {
		this.host.remove();
	}
}

function esc(s: string): string {
	return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function svgStroke(icon: string): string {
	return icon.replace(
		"<svg ",
		'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" ',
	);
}
