// Keyless fallback planner. No LLM: keyword-scores the snapshot, walks nav
// links toward likely sections, clicks the best match, and knows when to
// stop. Good enough to demo the loop without an OPENROUTER_API_KEY; the
// real product experience is the LLM planner in llm.ts.

import type { AgentAction, PageElement, PageSnapshot } from "./types.js";

export interface LocalPlannerState {
	query: string;
	visitedPaths: string[];
	clickedRefsByPath: Record<string, number[]>;
	actionsTaken: number;
}

const STOPWORDS = new Set([
	"the", "a", "an", "is", "are", "do", "does", "did", "i", "you", "your", "my",
	"me", "can", "could", "would", "should", "how", "what", "where", "when",
	"why", "and", "or", "to", "of", "in", "on", "for", "this", "that", "want",
	"need", "please", "tell", "show", "find", "get", "with", "up", "set",
]);

// Query word -> sections/labels it usually lives under. Lets "enable 2fa"
// route through a nav link that only says "Security".
const ALIASES: Record<string, string[]> = {
	"2fa": ["two-factor", "two factor", "security", "authentication", "mfa"],
	mfa: ["two-factor", "security", "authentication"],
	password: ["security"],
	passkey: ["security"],
	invoice: ["billing", "invoices"],
	plan: ["billing", "upgrade"],
	upgrade: ["billing", "plan"],
	payment: ["billing"],
	card: ["billing", "payment"],
	member: ["team", "members"],
	invite: ["team", "members"],
	teammate: ["team"],
	notification: ["notifications", "alerts"],
	email: ["notifications", "profile"],
	key: ["api", "keys", "developers"],
	token: ["api", "keys"],
	webhook: ["api", "developers"],
	name: ["profile", "account"],
	avatar: ["profile", "account"],
	theme: ["appearance", "preferences"],
};

function tokenize(query: string): string[] {
	return query
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, " ")
		.split(/\s+/)
		.filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

function expand(tokens: string[]): { primary: string[]; related: string[] } {
	const related = new Set<string>();
	for (const t of tokens) for (const alias of ALIASES[t] ?? []) related.add(alias);
	return { primary: tokens, related: [...related] };
}

function scoreName(name: string, primary: string[], related: string[]): number {
	const hay = name.toLowerCase();
	let score = 0;
	for (const t of primary) if (hay.includes(t)) score += 3;
	for (const t of related) if (hay.includes(t)) score += 1;
	return score;
}

const ACTIONABLE = new Set(["button", "link", "switch", "checkbox", "tab", "menuitem"]);

export function localNextAction(state: LocalPlannerState, snapshot: PageSnapshot): {
	action: AgentAction;
	status?: string;
} {
	const { primary, related } = expand(tokenize(state.query));
	if (!primary.length) {
		return { action: { type: "say", text: "Tell me what you'd like me to do on this page." } };
	}

	const path = snapshot.path;
	if (!state.visitedPaths.includes(path)) state.visitedPaths.push(path);
	const clickedHere = (state.clickedRefsByPath[path] ??= []);

	// 1) Direct hit on this page.
	let best: PageElement | null = null;
	let bestScore = 0;
	for (const el of snapshot.elements) {
		if (!ACTIONABLE.has(el.role)) continue;
		if (el.state?.disabled) continue;
		if (clickedHere.includes(el.ref)) continue;
		const score = scoreName(el.name, primary, related);
		if (score > bestScore) {
			bestScore = score;
			best = el;
		}
	}
	// Require at least one primary-token hit to act on this page.
	if (best && bestScore >= 3) {
		clickedHere.push(best.ref);
		state.actionsTaken += 1;
		return {
			action: { type: "click", ref: best.ref },
			status: `Opening "${best.name.slice(0, 44)}"…`,
		};
	}

	// 2) Walk a nav link toward a related section.
	let nav: PageElement | null = null;
	let navScore = 0;
	for (const el of snapshot.elements) {
		if (el.role !== "link" || !el.href) continue;
		const target = el.href.split("?")[0] ?? el.href;
		if (state.visitedPaths.includes(target)) continue;
		const score = scoreName(`${el.name} ${el.href}`, primary, related);
		if (score > navScore) {
			navScore = score;
			nav = el;
		}
	}
	if (nav && navScore > 0) {
		state.actionsTaken += 1;
		return {
			action: { type: "click", ref: nav.ref },
			status: `Heading to ${nav.name.slice(0, 44)}…`,
		};
	}

	// 3) Nothing left to try.
	if (state.actionsTaken > 0) {
		return {
			action: {
				type: "done",
				summary: "I've opened the closest match I could find — take a look.",
			},
		};
	}
	return {
		action: {
			type: "say",
			text: "I couldn't find that here. (Running in keyless demo mode — set OPENROUTER_API_KEY for the full agent.)",
		},
	};
}
