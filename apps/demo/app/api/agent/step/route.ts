type ElementState = {
	disabled?: boolean;
	checked?: boolean;
	selected?: boolean;
	expanded?: boolean;
	value?: string;
};

type PageElement = {
	ref: number;
	role: string;
	name: string;
	href?: string;
	state?: ElementState;
	inViewport?: boolean;
};

type PageSnapshot = {
	url: string;
	path: string;
	title: string;
	headings: string[];
	elements: PageElement[];
};

type AgentAction =
	| { type: "click"; ref: number }
	| { type: "fill"; ref: number; value: string }
	| { type: "navigate"; path: string }
	| { type: "scroll"; ref: number }
	| { type: "say"; text: string }
	| { type: "done"; summary: string }
	| { type: "fail"; reason: string };

type LocalPlannerState = {
	query: string;
	visitedPaths: string[];
	clickedRefsByPath: Record<string, number[]>;
	actionsTaken: number;
};

const sessions = new Map<string, LocalPlannerState>();
const actionableRoles = new Set([
	"button",
	"link",
	"switch",
	"checkbox",
	"tab",
	"menuitem",
]);
const stopwords = new Set([
	"the",
	"a",
	"an",
	"is",
	"are",
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
	"why",
	"and",
	"or",
	"to",
	"of",
	"in",
	"on",
	"for",
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
	"up",
	"set",
]);

const aliases: Record<string, string[]> = {
	"2fa": ["two-factor", "two factor", "security", "authentication", "mfa"],
	mfa: ["two-factor", "security", "authentication"],
	password: ["security"],
	passkey: ["security"],
	invoice: ["billing", "invoices"],
	plan: ["billing", "upgrade"],
	upgrade: ["billing", "plan"],
	payment: ["billing"],
	card: ["billing", "payment"],
	member: ["team", "members", "users", "roles"],
	invite: ["team", "members", "users"],
	teammate: ["team", "users"],
	user: ["users", "roles"],
	notification: ["notifications", "alerts"],
	email: ["notifications", "profile"],
	key: ["api", "keys", "developers"],
	token: ["api", "keys"],
	webhook: ["api", "developers", "integrations"],
	name: ["profile", "account"],
	avatar: ["profile", "account"],
	automation: ["automation", "rules"],
	rule: ["automation", "rules"],
	ticket: ["tickets", "inbox"],
	project: ["projects"],
};

function tokenize(query: string): string[] {
	return query
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, " ")
		.split(/\s+/)
		.filter((word) => word.length >= 2 && !stopwords.has(word));
}

function expand(tokens: string[]): { primary: string[]; related: string[] } {
	const related = new Set<string>();
	for (const token of tokens) {
		for (const alias of aliases[token] ?? []) related.add(alias);
	}
	return { primary: tokens, related: [...related] };
}

function scoreName(name: string, primary: string[], related: string[]): number {
	const haystack = name.toLowerCase();
	let score = 0;
	for (const token of primary) if (haystack.includes(token)) score += 3;
	for (const token of related) if (haystack.includes(token)) score += 1;
	return score;
}

function localNextAction(
	state: LocalPlannerState,
	snapshot: PageSnapshot,
): { action: AgentAction; status?: string } {
	const { primary, related } = expand(tokenize(state.query));
	if (!primary.length) {
		return {
			action: {
				type: "say",
				text: "Tell me what you want me to do in the demo.",
			},
		};
	}

	const path = snapshot.path;
	if (!state.visitedPaths.includes(path)) state.visitedPaths.push(path);
	const clickedHere = (state.clickedRefsByPath[path] ??= []);

	let best: PageElement | null = null;
	let bestScore = 0;
	for (const element of snapshot.elements) {
		if (!actionableRoles.has(element.role)) continue;
		if (element.state?.disabled) continue;
		if (clickedHere.includes(element.ref)) continue;

		const score = scoreName(element.name, primary, related);
		if (score > bestScore) {
			best = element;
			bestScore = score;
		}
	}

	if (best && bestScore >= 3) {
		clickedHere.push(best.ref);
		state.actionsTaken += 1;
		return {
			action: { type: "click", ref: best.ref },
			status: `Opening "${best.name.slice(0, 44)}"...`,
		};
	}

	let nav: PageElement | null = null;
	let navScore = 0;
	for (const element of snapshot.elements) {
		if (element.role !== "link" || !element.href) continue;
		const target = element.href.split("?")[0] ?? element.href;
		if (state.visitedPaths.includes(target)) continue;

		const score = scoreName(
			`${element.name} ${element.href}`,
			primary,
			related,
		);
		if (score > navScore) {
			nav = element;
			navScore = score;
		}
	}

	if (nav && navScore > 0) {
		state.actionsTaken += 1;
		return {
			action: { type: "click", ref: nav.ref },
			status: `Heading to ${nav.name.slice(0, 44)}...`,
		};
	}

	if (state.actionsTaken > 0) {
		return {
			action: {
				type: "done",
				summary: "I opened the closest matching demo area I could find.",
			},
		};
	}

	return {
		action: {
			type: "say",
			text: "I could not find that in this standalone demo. Try tickets, automation, billing, users, or 2FA.",
		},
	};
}

function newState(query: string): LocalPlannerState {
	return {
		query,
		visitedPaths: [],
		clickedRefsByPath: {},
		actionsTaken: 0,
	};
}

function validSnapshot(value: unknown): value is PageSnapshot {
	if (!value || typeof value !== "object") return false;
	const snapshot = value as PageSnapshot;
	return (
		typeof snapshot.path === "string" &&
		typeof snapshot.title === "string" &&
		Array.isArray(snapshot.elements)
	);
}

export async function POST(request: Request): Promise<Response> {
	let rawBody: unknown;
	try {
		rawBody = await request.json();
	} catch {
		return Response.json({ error: "invalid_json" }, { status: 400 });
	}

	const body = rawBody as {
		sessionId?: unknown;
		message?: unknown;
		snapshot?: unknown;
	};
	if (!validSnapshot(body.snapshot)) {
		return Response.json({ error: "invalid_snapshot" }, { status: 400 });
	}

	const incomingSessionId =
		typeof body.sessionId === "string" ? body.sessionId : undefined;
	const sessionId = incomingSessionId ?? crypto.randomUUID();
	const message = typeof body.message === "string" ? body.message.trim() : "";
	const state =
		message || !sessions.has(sessionId)
			? newState(message)
			: (sessions.get(sessionId) ?? newState(""));

	sessions.set(sessionId, state);

	const result = localNextAction(state, body.snapshot);
	if (["done", "fail", "say"].includes(result.action.type)) {
		sessions.delete(sessionId);
	}

	return Response.json({
		sessionId,
		action: result.action,
		status: result.status,
		source: "local",
	});
}

export function OPTIONS(): Response {
	return new Response(null, { status: 204 });
}
