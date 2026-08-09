// Chat-provider selection. Every provider here speaks the OpenAI
// chat-completions shape, so a provider is nothing but {baseUrl, key env,
// default model} — see packages/core/src/llm.ts.
//
// Embeddings are NOT part of this: search_knowledge_base and doc ingestion
// always call OpenRouter, because Groq has no embeddings endpoint. A
// Groq-only deployment gets the agent loop but no knowledge search.

export interface LlmProvider {
	name: string;
	baseUrl: string;
	apiKey?: string;
	model: string;
}

const PROVIDERS = {
	openrouter: {
		baseUrl: "https://openrouter.ai/api/v1",
		keyEnv: "OPENROUTER_API_KEY",
		defaultModel: "openai/gpt-5.3-codex",
	},
	groq: {
		baseUrl: "https://api.groq.com/openai/v1",
		keyEnv: "GROQ_API_KEY",
		// Cheapest Groq model that actually emits tool_calls ($0.075/$0.30 per M
		// as of 2026-08). llama-3.1-8b-instant is cheaper still ($0.05/$0.08)
		// but does NOT tool-call — it writes "<navigate>{...}</navigate>" as
		// prose, which llm.ts degrades to say(), so the agent talks and never
		// acts. Verified against this repo's actual tool schema; don't "save
		// money" by switching to it. Next tiers up: qwen/qwen3.6-27b,
		// llama-3.3-70b-versatile, openai/gpt-oss-120b — all tool-call fine.
		defaultModel: "openai/gpt-oss-20b",
	},
} as const;

export type ProviderName = keyof typeof PROVIDERS;

export function resolveLlmProvider(
	env: Record<string, string | undefined> = process.env,
): LlmProvider {
	const name = (env.LLM_PROVIDER?.trim() || "openrouter") as ProviderName;
	const provider = PROVIDERS[name];
	if (!provider) {
		throw new Error(
			`LLM_PROVIDER must be one of: ${Object.keys(PROVIDERS).join(", ")}`,
		);
	}
	return {
		name,
		baseUrl: provider.baseUrl,
		apiKey: env[provider.keyEnv]?.trim() || undefined,
		model: env.AGENT_MODEL?.trim() || provider.defaultModel,
	};
}
