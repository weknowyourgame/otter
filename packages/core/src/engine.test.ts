import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { SessionRow } from "otter-db";

// engine.ts (and the knowledge/memory modules it calls into) talk to
// Postgres via otter-db — mocked here so these tests exercise the actual
// tool-resolution loop and guard logic without a live database.
const fakeSessions = new Map<string, SessionRow>();
const usageEvents: Array<{ tenantId: string; totalTokens: number }> = [];

mock.module("otter-db", () => ({
	getSession: async (id: string) => fakeSessions.get(id),
	upsertSession: async (row: SessionRow) => {
		fakeSessions.set(row.id, row);
	},
	listSessions: async () => Array.from(fakeSessions.values()),
	deleteExpiredSessions: async () => {},
	insertUsageEvent: async (row: { tenantId: string; totalTokens: number }) => {
		usageEvents.push(row);
	},
	// No stored chunks in any test below — searchKnowledgeBase short-circuits
	// on an empty list before ever calling the embeddings endpoint.
	listAllChunks: async () => [],
	insertMemory: async () => {
		throw new Error("not used in these tests");
	},
	deleteMemory: async () => false,
	listMemoriesForUser: async () => [],
}));

const { runStep } = await import("./engine.js");

function fakeSnapshot() {
	return {
		url: "https://example.com/",
		path: "/",
		title: "Example",
		headings: [],
		elements: [],
	};
}

/** Chat-completions response body shaped like OpenRouter's, with a given tool call (or plain text). */
function completionResponse(options: {
	toolCall?: { name: string; args: Record<string, unknown> };
	text?: string;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}) {
	return {
		choices: [
			{
				message: {
					content: options.text ?? null,
					tool_calls: options.toolCall
						? [
								{
									id: "call_1",
									type: "function",
									function: {
										name: options.toolCall.name,
										arguments: JSON.stringify(options.toolCall.args),
									},
								},
							]
						: undefined,
				},
			},
		],
		usage: options.usage,
	};
}

let originalFetch: typeof fetch;

beforeEach(() => {
	fakeSessions.clear();
	usageEvents.length = 0;
	originalFetch = globalThis.fetch;
});

describe("runStep — tool-resolution loop", () => {
	it("stops after maxToolCallsPerTurn and returns a graceful fallback instead of looping forever", async () => {
		let fetchCalls = 0;
		globalThis.fetch = mock(async () => {
			fetchCalls++;
			return new Response(
				JSON.stringify(
					completionResponse({
						toolCall: {
							name: "search_knowledge_base",
							args: { query: "anything" },
						},
					}),
				),
				{ status: 200 },
			);
		}) as unknown as typeof fetch;

		const result = await runStep(
			{ message: "help", snapshot: fakeSnapshot() },
			{ apiKey: "test-key", tenantId: "tenant-1", maxToolCallsPerTurn: 3 },
		);

		expect(fetchCalls).toBe(3);
		expect(result.action.type).toBe("say");
		if (result.action.type === "say") {
			expect(result.action.text).toContain("couldn't pin that down");
		}
		globalThis.fetch = originalFetch;
	});

	it("returns the model's action directly when it doesn't call a resolving tool", async () => {
		globalThis.fetch = mock(async () => {
			return new Response(
				JSON.stringify(
					completionResponse({
						toolCall: { name: "say", args: { text: "Hi there!" } },
					}),
				),
				{ status: 200 },
			);
		}) as unknown as typeof fetch;

		const result = await runStep(
			{ message: "hello", snapshot: fakeSnapshot() },
			{ apiKey: "test-key", tenantId: "tenant-1" },
		);

		expect(result.action).toEqual({ type: "say", text: "Hi there!" });
		globalThis.fetch = originalFetch;
	});

	it("treats maxSteps 0 as unlimited", async () => {
		globalThis.fetch = mock(async () => {
			return new Response(
				JSON.stringify(
					completionResponse({
						toolCall: { name: "say", args: { text: "Still going." } },
					}),
				),
				{ status: 200 },
			);
		}) as unknown as typeof fetch;

		const result = await runStep(
			{ message: "do a long task", snapshot: fakeSnapshot() },
			{ apiKey: "test-key", tenantId: "tenant-1", maxSteps: 0 },
		);

		expect(result.action).toEqual({ type: "say", text: "Still going." });
		globalThis.fetch = originalFetch;
	});
});

describe("runStep — agentDisabled guard", () => {
	it("short-circuits before calling the model when the agent is disabled", async () => {
		let fetchCalls = 0;
		globalThis.fetch = mock(async () => {
			fetchCalls++;
			return new Response("{}", { status: 200 });
		}) as unknown as typeof fetch;

		const result = await runStep(
			{ message: "hello", snapshot: fakeSnapshot() },
			{ apiKey: "test-key", tenantId: "tenant-1", agentDisabled: true },
		);

		expect(fetchCalls).toBe(0);
		expect(result.action.type).toBe("say");
		if (result.action.type === "say") {
			expect(result.action.text).toContain("turned off");
		}
		globalThis.fetch = originalFetch;
	});
});

describe("runStep — system prompt addendum", () => {
	it("appends the tenant's custom instructions to the base system prompt sent to the model", async () => {
		let sentSystemMessage = "";
		globalThis.fetch = mock(async (_url: unknown, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body)) as {
				messages: Array<{ role: string; content: string }>;
			};
			sentSystemMessage =
				body.messages.find((m) => m.role === "system")?.content ?? "";
			return new Response(
				JSON.stringify(
					completionResponse({
						toolCall: { name: "say", args: { text: "ok" } },
					}),
				),
				{ status: 200 },
			);
		}) as unknown as typeof fetch;

		await runStep(
			{ message: "hi", snapshot: fakeSnapshot() },
			{
				apiKey: "test-key",
				tenantId: "tenant-1",
				systemPromptAddendum: "Always mention BANANAPHONE.",
			},
		);

		expect(sentSystemMessage).toContain("BANANAPHONE");
		globalThis.fetch = originalFetch;
	});
});
