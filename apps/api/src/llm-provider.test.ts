import { describe, expect, it } from "bun:test";
import { resolveLlmProvider } from "./llm-provider.js";

describe("resolveLlmProvider", () => {
	it("defaults to OpenRouter when LLM_PROVIDER is unset", () => {
		const provider = resolveLlmProvider({
			OPENROUTER_API_KEY: "sk-or-test",
		});
		expect(provider.name).toBe("openrouter");
		expect(provider.baseUrl).toBe("https://openrouter.ai/api/v1");
		expect(provider.model).toBe("openai/gpt-5.3-codex");
		expect(provider.apiKey).toBe("sk-or-test");
	});

	it("routes to Groq's cheapest model and reads GROQ_API_KEY", () => {
		const provider = resolveLlmProvider({
			LLM_PROVIDER: "groq",
			GROQ_API_KEY: "gsk-test",
			OPENROUTER_API_KEY: "sk-or-test",
		});
		expect(provider.baseUrl).toBe("https://api.groq.com/openai/v1");
		// Cheapest Groq model that emits real tool_calls — see llm-provider.ts.
		expect(provider.model).toBe("openai/gpt-oss-20b");
		// Must not leak the OpenRouter key into Groq chat calls.
		expect(provider.apiKey).toBe("gsk-test");
	});

	it("lets AGENT_MODEL override the provider default", () => {
		expect(
			resolveLlmProvider({
				LLM_PROVIDER: "groq",
				AGENT_MODEL: "llama-3.3-70b-versatile",
			}).model,
		).toBe("llama-3.3-70b-versatile");
	});

	it("treats a blank key as missing so the engine falls back to the local planner", () => {
		expect(
			resolveLlmProvider({ LLM_PROVIDER: "groq", GROQ_API_KEY: "  " }).apiKey,
		).toBeUndefined();
	});

	it("rejects an unknown provider instead of silently using OpenRouter", () => {
		expect(() => resolveLlmProvider({ LLM_PROVIDER: "anthropi" })).toThrow(
			/LLM_PROVIDER must be one of/,
		);
	});
});
