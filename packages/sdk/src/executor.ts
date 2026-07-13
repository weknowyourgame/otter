// The agent's hands. Executes exactly one engine action against the live
// DOM: scrolls the target into view, walks the cursor to it, performs the
// interaction, then waits for the page to settle before the next observe().

import { Cursor, TargetRing } from "./cursor.js";
import { findByRef } from "./observe.js";
import type { AgentAction, ExecutionResult } from "./types.js";

const SETTLE_QUIET_MS = 350;
const SETTLE_MAX_MS = 2600;

export class Executor {
	constructor(
		private cursor: Cursor,
		private ring: TargetRing,
		private reducedMotion: boolean,
	) {}

	async execute(action: AgentAction): Promise<ExecutionResult> {
		switch (action.type) {
			case "click":
				return this.click(action.ref);
			case "fill":
				return this.fill(action.ref, action.value);
			case "scroll":
				return this.scroll(action.ref);
			case "navigate":
				return this.navigate(action.path);
			default:
				return { ok: false, error: `not an executable action: ${action.type}` };
		}
	}

	private async approach(ref: number): Promise<HTMLElement | { error: string }> {
		const el = findByRef(ref);
		if (!el) return { error: "element no longer exists on this page" };

		el.scrollIntoView({ behavior: this.reducedMotion ? "auto" : "smooth", block: "center" });
		await wait(this.reducedMotion ? 60 : 380);

		const rect = el.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return { error: "element is not visible" };

		this.ring.showOver(rect);
		await this.cursor.moveTo(rect.left + rect.width / 2, rect.top + rect.height / 2);
		await wait(this.reducedMotion ? 30 : 160);
		return el;
	}

	private async click(ref: number): Promise<ExecutionResult> {
		const target = await this.approach(ref);
		if (!(target instanceof HTMLElement)) return { ok: false, error: target.error };

		if (
			("disabled" in target && (target as HTMLButtonElement).disabled) ||
			target.getAttribute("aria-disabled") === "true"
		) {
			this.ring.hide();
			return { ok: false, error: "element is disabled" };
		}

		await this.cursor.press();

		const hardNav = willHardNavigate(target);
		fireClick(target);
		this.ring.hide();
		if (hardNav) return { ok: true, hardNav: true };
		await settle();
		return { ok: true };
	}

	private async fill(ref: number, value: string): Promise<ExecutionResult> {
		const target = await this.approach(ref);
		if (!(target instanceof HTMLElement)) return { ok: false, error: target.error };

		await this.cursor.press();
		target.focus();

		if (target instanceof HTMLSelectElement) {
			const option = Array.from(target.options).find(
				(o) => o.value === value || o.text.trim().toLowerCase() === value.trim().toLowerCase(),
			);
			if (!option) {
				this.ring.hide();
				return { ok: false, error: `no option matching "${value}"` };
			}
			setNativeValue(target, option.value);
			target.dispatchEvent(new Event("change", { bubbles: true }));
		} else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
			setNativeValue(target, "");
			target.dispatchEvent(new Event("input", { bubbles: true }));
			// Type visibly, character by character — capped so long values stay quick.
			const perChar = this.reducedMotion ? 0 : Math.min(24, 700 / Math.max(value.length, 1));
			for (let i = 1; i <= value.length; i++) {
				setNativeValue(target, value.slice(0, i));
				target.dispatchEvent(new Event("input", { bubbles: true }));
				if (perChar > 0) await wait(perChar);
			}
			target.dispatchEvent(new Event("change", { bubbles: true }));
		} else if (target.isContentEditable) {
			target.innerText = value;
			target.dispatchEvent(new Event("input", { bubbles: true }));
		} else {
			this.ring.hide();
			return { ok: false, error: "element is not fillable" };
		}

		this.ring.hide();
		await settle();
		return { ok: true };
	}

	private async scroll(ref: number): Promise<ExecutionResult> {
		const el = findByRef(ref);
		if (!el) return { ok: false, error: "element no longer exists on this page" };
		el.scrollIntoView({ behavior: this.reducedMotion ? "auto" : "smooth", block: "center" });
		await wait(this.reducedMotion ? 60 : 420);
		const rect = el.getBoundingClientRect();
		this.ring.showOver(rect);
		await this.cursor.moveTo(rect.left + rect.width / 2, rect.top + rect.height / 2);
		await wait(900);
		this.ring.hide();
		return { ok: true };
	}

	private async navigate(path: string): Promise<ExecutionResult> {
		// Prefer clicking a real link so SPA routers stay in charge.
		const links = document.querySelectorAll<HTMLAnchorElement>("a[href]");
		for (const link of links) {
			try {
				const url = new URL(link.href, location.href);
				if (url.origin === location.origin && url.pathname === path) {
					const rect = link.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0) {
						this.ring.showOver(rect);
						await this.cursor.moveTo(rect.left + rect.width / 2, rect.top + rect.height / 2);
						await this.cursor.press();
						fireClick(link);
						this.ring.hide();
						await settle();
						return { ok: true };
					}
				}
			} catch {
				/* skip unparseable hrefs */
			}
		}
		// Full page load — the loop persists itself and resumes after reload.
		return { ok: true, hardNav: true };
	}
}

function fireClick(el: HTMLElement): void {
	const opts = { bubbles: true, cancelable: true, view: window } as const;
	el.dispatchEvent(new PointerEvent("pointerdown", opts));
	el.dispatchEvent(new MouseEvent("mousedown", opts));
	el.dispatchEvent(new PointerEvent("pointerup", opts));
	el.dispatchEvent(new MouseEvent("mouseup", opts));
	el.click();
}

// React tracks input values internally; assigning .value directly gets
// swallowed. Setting through the native prototype setter makes the
// subsequent input event register as a real change.
function setNativeValue(
	el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
	value: string,
): void {
	const proto =
		el instanceof HTMLTextAreaElement
			? HTMLTextAreaElement.prototype
			: el instanceof HTMLSelectElement
				? HTMLSelectElement.prototype
				: HTMLInputElement.prototype;
	const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
	if (setter) setter.call(el, value);
	else (el as HTMLInputElement).value = value;
}

function wait(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/** Wait until DOM mutations go quiet — SPAs re-render asynchronously. */
export function settle(): Promise<void> {
	return new Promise((resolve) => {
		let quietTimer: number;
		const maxTimer = window.setTimeout(() => {
			observer.disconnect();
			resolve();
		}, SETTLE_MAX_MS);
		const done = () => {
			window.clearTimeout(maxTimer);
			observer.disconnect();
			resolve();
		};
		const observer = new MutationObserver(() => {
			window.clearTimeout(quietTimer);
			quietTimer = window.setTimeout(done, SETTLE_QUIET_MS);
		});
		observer.observe(document.body, { childList: true, subtree: true, attributes: true });
		quietTimer = window.setTimeout(done, SETTLE_QUIET_MS);
	});
}

function willHardNavigate(el: HTMLElement): boolean {
	const anchor = el.closest("a[href]");
	if (!(anchor instanceof HTMLAnchorElement)) return false;
	if (anchor.target === "_blank") return false;
	try {
		const url = new URL(anchor.href, location.href);
		return url.origin !== location.origin;
	} catch {
		return false;
	}
}
