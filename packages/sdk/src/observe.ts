// The agent's eyes: serialize the live page into a compact, LLM-readable
// snapshot. Every interactive element gets a stable numeric ref stamped on
// the node as data-otto-ref — the executor targets elements only that way.

import type { ElementState, PageElement, PageSnapshot } from "./types.js";

export const HOST_ID = "otto-host";
const REF_ATTR = "data-otto-ref";
const MAX_ELEMENTS = 160;
const MAX_HEADINGS = 12;

const CANDIDATE_SELECTOR = [
	"a[href]",
	"button",
	"input",
	"select",
	"textarea",
	"summary",
	"[role='button']",
	"[role='link']",
	"[role='tab']",
	"[role='checkbox']",
	"[role='switch']",
	"[role='menuitem']",
	"[role='option']",
	"[contenteditable='true']",
].join(", ");

const refByNode = new WeakMap<Element, number>();
let refCounter = 0;

function isVisible(el: HTMLElement): boolean {
	if (el.closest("[aria-hidden='true']")) return false;
	const style = getComputedStyle(el);
	if (style.display === "none" || style.visibility === "hidden") return false;
	if (Number.parseFloat(style.opacity) === 0) return false;
	const rect = el.getBoundingClientRect();
	return rect.width > 1 && rect.height > 1;
}

function roleOf(el: HTMLElement): string {
	const explicit = el.getAttribute("role");
	if (explicit) {
		if (["button", "link", "tab", "checkbox", "switch", "menuitem", "option"].includes(explicit)) {
			return explicit;
		}
	}
	const tag = el.tagName.toLowerCase();
	if (tag === "a") return "link";
	if (tag === "button" || tag === "summary") return "button";
	if (tag === "select") return "select";
	if (tag === "textarea") return "textbox";
	if (el.isContentEditable) return "textbox";
	if (tag === "input") {
		const type = ((el as HTMLInputElement).type || "text").toLowerCase();
		if (type === "checkbox") return "checkbox";
		if (type === "radio") return "radio";
		if (["button", "submit", "reset", "image"].includes(type)) return "button";
		if (type === "range") return "slider";
		return "textbox";
	}
	return "button";
}

function nameOf(el: HTMLElement): string {
	const aria = el.getAttribute("aria-label");
	if (aria?.trim()) return clip(aria);

	const labelledBy = el.getAttribute("aria-labelledby");
	if (labelledBy) {
		const text = labelledBy
			.split(/\s+/)
			.map((id) => document.getElementById(id)?.innerText ?? "")
			.join(" ")
			.trim();
		if (text) return clip(text);
	}

	if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
		const label = (el.labels?.[0]?.innerText ?? "").trim();
		if (label) return clip(label);
		const placeholder = el.getAttribute("placeholder");
		if (placeholder?.trim()) return clip(placeholder);
	}

	const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
	if (text) return clip(text);
	return clip(el.getAttribute("title") || el.getAttribute("alt") || el.tagName.toLowerCase());
}

function clip(s: string): string {
	const t = s.replace(/\s+/g, " ").trim();
	return t.length > 90 ? `${t.slice(0, 87)}…` : t;
}

function stateOf(el: HTMLElement, role: string): ElementState | undefined {
	const state: ElementState = {};
	let any = false;

	if (("disabled" in el && (el as HTMLButtonElement).disabled) || el.getAttribute("aria-disabled") === "true") {
		state.disabled = true;
		any = true;
	}
	if (role === "checkbox" || role === "switch" || role === "radio") {
		const checked =
			el instanceof HTMLInputElement ? el.checked : el.getAttribute("aria-checked") === "true";
		state.checked = checked;
		any = true;
	}
	if (role === "tab" || role === "option") {
		if (el.getAttribute("aria-selected") === "true") {
			state.selected = true;
			any = true;
		}
	}
	const expanded = el.getAttribute("aria-expanded");
	if (expanded !== null) {
		state.expanded = expanded === "true";
		any = true;
	}
	if (role === "textbox" || role === "select") {
		let value = "";
		if (el instanceof HTMLInputElement) {
			value = el.type === "password" ? (el.value ? "••••" : "") : el.value;
		} else if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
			value = el.value;
		} else if (el.isContentEditable) {
			value = el.innerText;
		}
		state.value = value.length > 60 ? `${value.slice(0, 57)}…` : value;
		any = true;
	}
	return any ? state : undefined;
}

function refOf(el: Element): number {
	let ref = refByNode.get(el);
	if (ref === undefined) {
		refCounter += 1;
		ref = refCounter;
		refByNode.set(el, ref);
	}
	el.setAttribute(REF_ATTR, String(ref));
	return ref;
}

export function findByRef(ref: number): HTMLElement | null {
	const el = document.querySelector(`[${REF_ATTR}="${ref}"]`);
	return el instanceof HTMLElement ? el : null;
}

export function observe(): PageSnapshot {
	const host = document.getElementById(HOST_ID);
	const elements: PageElement[] = [];
	const viewportH = window.innerHeight;
	const viewportW = window.innerWidth;

	for (const node of document.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR)) {
		if (elements.length >= MAX_ELEMENTS) break;
		if (host?.contains(node)) continue;
		if (!isVisible(node)) continue;
		if (node instanceof HTMLInputElement && node.type === "hidden") continue;

		const role = roleOf(node);
		const name = nameOf(node);
		if (!name) continue;

		const rect = node.getBoundingClientRect();
		const entry: PageElement = {
			ref: refOf(node),
			role,
			name,
			inViewport: rect.bottom > 0 && rect.top < viewportH && rect.right > 0 && rect.left < viewportW,
		};

		if (node instanceof HTMLAnchorElement && node.href) {
			try {
				const url = new URL(node.href, location.href);
				if (url.origin === location.origin) entry.href = url.pathname;
				else entry.href = url.href.slice(0, 100);
			} catch {
				/* unparseable href — omit */
			}
		}

		const state = stateOf(node, role);
		if (state) entry.state = state;
		elements.push(entry);
	}

	const headings: string[] = [];
	for (const h of document.querySelectorAll<HTMLElement>("h1, h2, h3")) {
		if (headings.length >= MAX_HEADINGS) break;
		if (host?.contains(h) || !isVisible(h)) continue;
		const text = clip(h.innerText);
		if (text) headings.push(text);
	}

	return {
		url: location.href,
		path: location.pathname,
		title: document.title,
		headings,
		elements,
	};
}
