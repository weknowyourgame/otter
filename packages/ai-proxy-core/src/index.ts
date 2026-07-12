// The one implementation of "call an LLM to match a user message against a
// DOM snapshot" in this monorepo. packages/server (local Node http server)
// and apps/landing's Vercel functions + vite dev middleware all import this
// instead of keeping their own copies — see packages/sdk/README.md's
// "Backend" section for the contract this implements.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "nvidia/nemotron-nano-9b-v2:free";
const MAX_ELEMENTS = 60;
const REQUEST_TIMEOUT_MS = 15000;
// This model reasons at length regardless of the OpenRouter `reasoning`
// toggle, and reasoning tokens count against max_tokens — give it enough
// budget to finish reasoning AND emit the final JSON answer.
const MAX_TOKENS = 700;

type ProxyElement = {
	id?: unknown;
	tag?: unknown;
	text?: unknown;
	role?: unknown;
	ariaLabel?: unknown;
	aiAction?: unknown;
	aiSection?: unknown;
};

export type AIProposalResult = { status: number; body: Record<string, unknown> };

const sanitizeElement = (raw: ProxyElement) => ({
	id: typeof raw.id === "string" ? raw.id : "",
	tag: typeof raw.tag === "string" ? raw.tag : "",
	text: typeof raw.text === "string" ? raw.text.slice(0, 80) : "",
	role: typeof raw.role === "string" ? raw.role : null,
	ariaLabel: typeof raw.ariaLabel === "string" ? raw.ariaLabel : null,
	aiAction: typeof raw.aiAction === "string" ? raw.aiAction : null,
	aiSection: typeof raw.aiSection === "string" ? raw.aiSection : null,
});

const extractJson = (content: string): unknown => {
	const start = content.indexOf("{");
	const end = content.lastIndexOf("}");
	if (start === -1 || end === -1 || end < start) return null;
	try {
		return JSON.parse(content.slice(start, end + 1));
	} catch {
		return null;
	}
};

const SYSTEM_PROMPT =
	"detailed thinking off\n" +
	"You control a DOM assistant for a web page that can scroll to, highlight, or click elements. " +
	"Given a user message and a JSON list of visible page elements, decide which single element (if any) " +
	"the user wants, and what to do with it. Respond with ONLY compact JSON, no prose, no markdown fences, matching this shape: " +
	'{"targetId": string|null, "action": "scrollAndHighlight"|"click"|"none", "reply": string}. ' +
	"targetId must be one of the provided element ids, or null if nothing matches. " +
	'action must be "none" when targetId is null. ' +
	'Use "click" only when the user clearly wants to navigate to, open, or activate something ' +
	'(e.g. "take me to the docs", "open pricing", "click sign up"). ' +
	'Use "scrollAndHighlight" when the user is just asking where something is (e.g. "where is pricing"), ' +
	"or when the target looks sensitive — payment, delete, billing, password, confirm, purchase, checkout, " +
	'submit, or account changes — never propose "click" for those, use scrollAndHighlight instead. ' +
	"reply is a short, friendly one-sentence message to show the user. " +
	"Note: the assistant itself independently re-verifies every click against the live page before firing — " +
	"it will refuse and highlight instead if an element turns out to be risky, so treat scrollAndHighlight as the safe default when unsure.";

export async function handleAIProposal(
	rawMessage: unknown,
	rawElements: unknown,
	apiKey: string | undefined,
): Promise<AIProposalResult> {
	const message = typeof rawMessage === "string" ? rawMessage.trim().slice(0, 500) : "";
	if (!message) {
		return { status: 400, body: { ok: false, error: "empty_message" } };
	}

	const elements = (Array.isArray(rawElements) ? rawElements : [])
		.slice(0, MAX_ELEMENTS)
		.map((el) => sanitizeElement(el as ProxyElement))
		.filter((el) => el.id);

	if (!apiKey) {
		return { status: 200, body: { ok: false, error: "ai_not_configured" } };
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(OPENROUTER_URL, {
			method: "POST",
			headers: {
				authorization: `Bearer ${apiKey}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				model: MODEL,
				temperature: 0.2,
				max_tokens: MAX_TOKENS,
				messages: [
					{ role: "system", content: SYSTEM_PROMPT },
					{
						role: "user",
						content: `User message: ${JSON.stringify(message)}\n\nPage elements:\n${JSON.stringify(elements)}`,
					},
				],
			}),
			signal: controller.signal,
		});

		if (!response.ok) {
			return { status: 200, body: { ok: false, error: "ai_upstream_error" } };
		}

		const data = (await response.json()) as {
			choices?: { message?: { content?: string } }[];
		};
		const content = data.choices?.[0]?.message?.content ?? "";
		const parsed = extractJson(content) as
			| { targetId?: unknown; action?: unknown; reply?: unknown }
			| null;

		if (!parsed) {
			return { status: 200, body: { ok: false, error: "ai_parse_error" } };
		}

		const targetId = typeof parsed.targetId === "string" ? parsed.targetId : null;
		const validTarget = Boolean(targetId) && elements.some((el) => el.id === targetId);
		// The model's action choice is advisory only — a UX hint for which
		// verb to show the user. The SDK client independently re-checks
		// risk/clickability against the live DOM before ever firing a click.
		const action = validTarget ? (parsed.action === "click" ? "click" : "scrollAndHighlight") : "none";
		const reply =
			typeof parsed.reply === "string" && parsed.reply.trim()
				? parsed.reply.trim().slice(0, 240)
				: validTarget
					? "I found something that matches. Want me to show it?"
					: "I could not find that on this page.";

		return {
			status: 200,
			body: {
				ok: true,
				targetId: validTarget ? targetId : null,
				action,
				reply,
			},
		};
	} catch (error) {
		console.error("[ai-proxy-core]", error);
		return { status: 200, body: { ok: false, error: "ai_request_failed" } };
	} finally {
		clearTimeout(timeout);
	}
}
