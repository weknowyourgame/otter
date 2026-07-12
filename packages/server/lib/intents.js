// Deterministic intent registry — checked BEFORE any LLM call. Each entry
// maps support-question phrasings to a concrete guidance plan (route +
// selector + action) inside the demo SaaS app. Selectors here must exist on
// the demo app pages (examples/nextjs-loginwithchatgpt/app/settings/*) —
// never invent selectors for intents that have no real UI behind them.

export const INTENT_REGISTRY = [
	{
		intent: "enable_2fa",
		targetLabel: "Two-factor authentication",
		aliases: [
			"enable 2fa",
			"turn on 2fa",
			"two factor",
			"two-factor",
			"2fa",
			"mfa",
			"authenticator",
			"security code",
			"where is 2fa",
		],
		route: "/settings/security",
		targetSelector: "[data-ai-action='enable-2fa']",
		action: "scrollAndHighlight",
		risk: "medium",
		reply: "I found the right place. Open 2FA settings:",
	},
	{
		intent: "invite_teammate",
		targetLabel: "Invite teammate",
		aliases: [
			"invite teammate",
			"add user",
			"team member",
			"teammate",
			"invite user",
			"team settings",
		],
		route: "/settings/team",
		targetSelector: "[data-ai-action='invite-teammate']",
		action: "scrollAndHighlight",
		risk: "low",
		reply: "I found it. Open team settings:",
	},
	{
		intent: "billing_settings",
		targetLabel: "Billing settings",
		aliases: ["billing", "invoice", "payment method", "change card", "subscription"],
		route: "/settings/billing",
		targetSelector: "[data-ai-section='billing']",
		action: "scrollAndHighlight",
		risk: "high",
		reply: "I found billing settings. I can show you where it is:",
	},
];

const normalize = (text) =>
	String(text || "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();

/**
 * Deterministic resolver: case-insensitive substring match of each alias
 * against the message. First registry entry with a matching alias wins
 * (registry order is the priority order).
 */
export function resolveIntent(message) {
	const haystack = normalize(message);
	if (!haystack) return null;
	for (const entry of INTENT_REGISTRY) {
		if (entry.aliases.some((alias) => haystack.includes(normalize(alias)))) {
			return entry;
		}
	}
	return null;
}

const FALLBACK_SYSTEM_PROMPT =
	"detailed thinking off\n" +
	"You classify a customer support question into one of a fixed set of product intents. " +
	"Respond with ONLY compact JSON, no prose, no markdown fences: " +
	'{"intent": string|null}. ' +
	"intent must be exactly one of the provided intent ids, or null if none clearly applies. " +
	"When unsure, answer null — a wrong guess sends the customer to the wrong page, which is worse than no guess.";

/**
 * Optional LLM fallback (OpenRouter, free Nemotron model) for phrasings the
 * alias list misses. It can only ever pick from the fixed registry — the
 * model chooses an intent id, and the plan (route/selector/action/risk)
 * still comes from the registry entry, never from the model.
 * Returns a registry entry or null. Skips silently when no API key is set.
 */
export async function resolveIntentWithLLM(message, apiKey, { timeoutMs = 10000 } = {}) {
	if (!apiKey) return null;
	const question = normalize(message).slice(0, 500);
	if (!question) return null;

	const catalog = INTENT_REGISTRY.map((e) => ({
		intent: e.intent,
		examples: e.aliases.slice(0, 4),
	}));

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				authorization: `Bearer ${apiKey}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				model: "nvidia/nemotron-nano-9b-v2:free",
				temperature: 0.1,
				max_tokens: 400,
				messages: [
					{ role: "system", content: FALLBACK_SYSTEM_PROMPT },
					{
						role: "user",
						content: `Question: ${JSON.stringify(question)}\n\nIntents:\n${JSON.stringify(catalog)}`,
					},
				],
			}),
			signal: controller.signal,
		});
		if (!response.ok) return null;
		const data = await response.json();
		const content = data.choices?.[0]?.message?.content ?? "";
		const start = content.indexOf("{");
		const end = content.lastIndexOf("}");
		if (start === -1 || end <= start) return null;
		const parsed = JSON.parse(content.slice(start, end + 1));
		if (typeof parsed.intent !== "string") return null;
		return INTENT_REGISTRY.find((e) => e.intent === parsed.intent) ?? null;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
