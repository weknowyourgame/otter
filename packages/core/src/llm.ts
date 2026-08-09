import type { AgentAction } from "./types.js";

export interface ChatMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: string;
	tool_calls?: Array<{
		id: string;
		type: "function";
		function: { name: string; arguments: string };
	}>;
	tool_call_id?: string;
}

const TOOLS = [
	tool("click", "Click an interactive element.", {
		ref: { type: "integer", description: "Element ref from the page state" },
		status: { type: "string", description: "Short present-tense progress line for the user" },
	}, ["ref", "status"]),
	tool("fill", "Type a value into an input, textarea, or select.", {
		ref: { type: "integer" },
		value: { type: "string" },
		status: { type: "string" },
	}, ["ref", "value", "status"]),
	tool("navigate", "Go to a path in this app directly (prefer clicking visible links).", {
		path: { type: "string", description: "Absolute path like /settings/security" },
		status: { type: "string" },
	}, ["path", "status"]),
	tool("scroll", "Scroll an element into view without interacting with it.", {
		ref: { type: "integer" },
		status: { type: "string" },
	}, ["ref", "status"]),
	tool("say", "Send the user a message and pause for their reply.", {
		text: { type: "string" },
	}, ["text"]),
	tool(
		"search_knowledge_base",
		"Look up relevant info from the app's help docs to answer a question. Use this when the user is asking what/how/why something works, not asking you to perform an action. Resolves server-side — you'll get results back and can call it again or answer.",
		{ query: { type: "string", description: "What to search for" } },
		["query"],
	),
	tool("done", "The task is complete and the page state proves it.", {
		summary: { type: "string", description: "One short friendly sentence" },
	}, ["summary"]),
	tool("fail", "You cannot complete this task in this app.", {
		reason: { type: "string" },
	}, ["reason"]),
];

const MEMORY_TOOLS = [
	tool(
		"remember",
		"Store a durable fact about this user for future sessions — a stated preference, a constraint, or something they've already done (e.g. 'already enabled 2FA'). Don't store one-off details that only matter for the current task. Resolves server-side, doesn't end your turn.",
		{ content: { type: "string" } },
		["content"],
	),
	tool(
		"forget",
		"Delete a previously remembered fact that's now stale or wrong. Use the [id] shown in the known-facts list you were given.",
		{ memory_id: { type: "string" } },
		["memory_id"],
	),
];

function tool(
	name: string,
	description: string,
	properties: Record<string, unknown>,
	required: string[],
) {
	return {
		type: "function" as const,
		function: {
			name,
			description,
			parameters: { type: "object", properties, required, additionalProperties: false },
		},
	};
}

export type LLMUsage = {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
};

/** The raw assistant message, to append to history verbatim, in all variants. */
export type LLMStep = {
	usage?: LLMUsage;
} & (
	| { kind: "action"; action: AgentAction; status?: string; assistantMessage: ChatMessage }
	| { kind: "search"; query: string; toolCallId: string; assistantMessage: ChatMessage }
	| { kind: "remember"; content: string; toolCallId: string; assistantMessage: ChatMessage }
	| { kind: "forget"; memoryId: string; toolCallId: string; assistantMessage: ChatMessage }
);

// Every supported provider speaks the OpenAI chat-completions shape, so
// swapping one in is a base-URL change and nothing else. See apps/api's
// LLM_PROVIDERS for the registry.
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

export async function requestNextAction(
	messages: ChatMessage[],
	apiKey: string,
	model: string,
	options: { includeMemoryTools?: boolean; baseUrl?: string } = {},
): Promise<LLMStep> {
	// Memory tools are only offered when there's a userKey to scope them to
	// (see engine.ts) — no point letting the model call a tool that can't
	// actually persist anything for an anonymous session.
	const tools = options.includeMemoryTools ? [...TOOLS, ...MEMORY_TOOLS] : TOOLS;
	const baseUrl = (options.baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");

	const res = await fetch(`${baseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			authorization: `Bearer ${apiKey}`,
			"content-type": "application/json",
			"x-title": "Otter Agent",
		},
		body: JSON.stringify({
			model,
			messages,
			tools,
			tool_choice: "auto",
			temperature: 0.2,
			max_tokens: 600,
		}),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`llm_${res.status}: ${text.slice(0, 300)}`);
	}

	const body = (await res.json()) as {
		choices?: Array<{
			message?: {
				content?: string | null;
				tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
			};
		}>;
		usage?: {
			prompt_tokens?: number;
			completion_tokens?: number;
			total_tokens?: number;
		};
	};

	const msg = body.choices?.[0]?.message;
	if (!msg) throw new Error("llm_empty_response");

	const usage: LLMUsage | undefined = body.usage
		? {
				promptTokens: body.usage.prompt_tokens ?? 0,
				completionTokens: body.usage.completion_tokens ?? 0,
				totalTokens: body.usage.total_tokens ?? 0,
			}
		: undefined;

	const assistantMessage: ChatMessage = {
		role: "assistant",
		content: msg.content ?? "",
		...(msg.tool_calls?.length ? { tool_calls: msg.tool_calls } : {}),
	};

	const call = msg.tool_calls?.[0];
	if (!call) {
		// Model answered in prose — treat it as say() so the loop still behaves.
		const text = (msg.content ?? "").trim() || "I'm not sure how to proceed — could you rephrase?";
		return { kind: "action", action: { type: "say", text }, assistantMessage, usage };
	}

	let args: Record<string, unknown> = {};
	try {
		args = JSON.parse(call.function.arguments || "{}");
	} catch {
		throw new Error("llm_bad_tool_args");
	}

	if (call.function.name === "search_knowledge_base") {
		return { kind: "search", query: String(args.query ?? ""), toolCallId: call.id, assistantMessage, usage };
	}
	if (call.function.name === "remember") {
		return { kind: "remember", content: String(args.content ?? ""), toolCallId: call.id, assistantMessage, usage };
	}
	if (call.function.name === "forget") {
		return { kind: "forget", memoryId: String(args.memory_id ?? ""), toolCallId: call.id, assistantMessage, usage };
	}

	const status = typeof args.status === "string" ? args.status : undefined;
	const action = toAction(call.function.name, args);
	return { kind: "action", action, status, assistantMessage, usage };
}

function toAction(name: string, args: Record<string, unknown>): AgentAction {
	switch (name) {
		case "click":
			return { type: "click", ref: int(args.ref) };
		case "fill":
			return { type: "fill", ref: int(args.ref), value: String(args.value ?? "") };
		case "navigate":
			return { type: "navigate", path: String(args.path ?? "/") };
		case "scroll":
			return { type: "scroll", ref: int(args.ref) };
		case "say":
			return { type: "say", text: String(args.text ?? "") };
		case "done":
			return { type: "done", summary: String(args.summary ?? "Done.") };
		case "fail":
			return { type: "fail", reason: String(args.reason ?? "I couldn't complete that.") };
		default:
			return { type: "fail", reason: `Unknown action "${name}".` };
	}
}

function int(v: unknown): number {
	const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
	return Number.isFinite(n) ? n : -1;
}
