import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { SessionRow } from "otter-db";

// engine.ts (and the knowledge/memory modules it calls into) talk to
// Postgres via otter-db — mocked here so these tests exercise the actual
// tool-resolution loop and guard logic without a live database.
const fakeSessions = new Map<string, SessionRow>();
const usageEvents: Array<{ tenantId: string; totalTokens: number }> = [];
const storedPlaybooks: Array<{ intent: string; steps: string }> = [];
let fakePlaybookRows: Array<{
	intent: string;
	steps: string;
	embedding: string | null;
}> = [];

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
	listPlaybooks: async () => fakePlaybookRows,
	upsertPlaybook: async (row: { intent: string; steps: string }) => {
		storedPlaybooks.push(row);
	},
}));

const { runStep } = await import("./engine.js");
const { findPlaybook, formatPlaybookForPrompt, recordPlaybook } = await import(
	"./playbooks.js"
);
const { describeAction } = await import("./trace.js");

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
	storedPlaybooks.length = 0;
	fakePlaybookRows = [];
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

/** Every embeddings call returns `vector`, so similarity is exactly controllable. */
function mockEmbedding(vector: number[]) {
	globalThis.fetch = mock(async () => {
		return new Response(JSON.stringify({ data: [{ embedding: vector }] }), {
			status: 200,
		});
	}) as unknown as typeof fetch;
}

describe("action traces", () => {
	const snapshot = {
		url: "https://example.com/settings/security",
		path: "/settings/security",
		title: "Security",
		headings: ["Security"],
		elements: [
			{ ref: 1, role: "switch", name: "Two-factor authentication" },
			{ ref: 2, role: "textbox", name: "Recovery email" },
		],
	};

	it("resolves a ref to the element's role and name", () => {
		expect(describeAction({ type: "click", ref: 1 }, snapshot)).toMatchObject({
			path: "/settings/security",
			type: "click",
			role: "switch",
			name: "Two-factor authentication",
		});
	});

	it("never records what was typed into a field", () => {
		const step = describeAction(
			{ type: "fill", ref: 2, value: "someone@private.example" },
			snapshot,
		);
		expect(step).toMatchObject({ type: "fill", name: "Recovery email" });
		expect(JSON.stringify(step)).not.toContain("private.example");
	});

	it("drops invented refs and non-route actions", () => {
		expect(
			describeAction({ type: "click", ref: 99 }, snapshot),
		).toBeUndefined();
		expect(
			describeAction({ type: "done", summary: "All set." }, snapshot),
		).toBeUndefined();
	});

	it("stores the trace on the session row", async () => {
		globalThis.fetch = mock(async () => {
			return new Response(
				JSON.stringify(
					completionResponse({
						toolCall: { name: "click", args: { ref: 1, status: "Enabling…" } },
					}),
				),
				{ status: 200 },
			);
		}) as unknown as typeof fetch;

		const result = await runStep(
			{ message: "turn on 2fa", snapshot },
			{ apiKey: "test-key", tenantId: "tenant-1" },
		);

		const row = fakeSessions.get(result.sessionId);
		expect(JSON.parse(row?.trace ?? "[]")).toMatchObject([
			{ type: "click", role: "switch", name: "Two-factor authentication" },
		]);
		globalThis.fetch = originalFetch;
	});
});

describe("playbooks", () => {
	const trace = [
		{
			at: 1,
			path: "/settings",
			type: "click" as const,
			role: "link",
			name: "Security",
		},
		{
			at: 2,
			path: "/settings/security",
			type: "click" as const,
			role: "switch",
			name: "Two-factor authentication",
		},
	];

	it("distils a done session into a tenant-scoped route", async () => {
		mockEmbedding([1, 0]);
		await recordPlaybook(
			{ id: "s1", tenantId: "tenant-1", title: "turn on 2fa", trace },
			"embed-key",
		);
		expect(storedPlaybooks).toHaveLength(1);
		expect(JSON.parse(storedPlaybooks[0]?.steps ?? "[]")).toHaveLength(2);
		globalThis.fetch = originalFetch;
	});

	it("refuses to store a route with no tenant to scope it to", async () => {
		mockEmbedding([1, 0]);
		await recordPlaybook(
			{ id: "s1", title: "turn on 2fa", trace },
			"embed-key",
		);
		expect(storedPlaybooks).toHaveLength(0);
		globalThis.fetch = originalFetch;
	});

	it("skips single-action sessions — one click is not a route", async () => {
		mockEmbedding([1, 0]);
		await recordPlaybook(
			{
				id: "s1",
				tenantId: "tenant-1",
				title: "turn on 2fa",
				trace: trace.slice(0, 1),
			},
			"embed-key",
		);
		expect(storedPlaybooks).toHaveLength(0);
		globalThis.fetch = originalFetch;
	});

	it("returns nothing when the closest route isn't close enough", async () => {
		// Stored vector is orthogonal to the query's, so cosine is 0.
		fakePlaybookRows = [
			{
				intent: "cancel my plan",
				steps: "[]",
				embedding: JSON.stringify([0, 1]),
			},
		];
		mockEmbedding([1, 0]);
		expect(
			await findPlaybook("turn on 2fa", "embed-key", "tenant-1"),
		).toBeUndefined();
		globalThis.fetch = originalFetch;
	});

	it("frames a matched route as a hint that loses to the live page", async () => {
		fakePlaybookRows = [
			{
				intent: "turn on 2fa",
				steps: JSON.stringify(trace),
				embedding: JSON.stringify([1, 0]),
			},
		];
		mockEmbedding([1, 0]);
		const match = await findPlaybook("enable 2fa", "embed-key", "tenant-1");
		expect(match?.intent).toBe("turn on 2fa");

		const prompt = formatPlaybookForPrompt(match as NonNullable<typeof match>);
		expect(prompt).toContain('click switch "Two-factor authentication"');
		expect(prompt).toContain("not an instruction");
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
