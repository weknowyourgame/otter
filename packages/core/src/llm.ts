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

/** The raw assistant message, to append to history verbatim, in both variants. */
export type LLMStep =
	| { kind: "action"; action: AgentAction; status?: string; assistantMessage: ChatMessage }
	| { kind: "search"; query: string; toolCallId: string; assistantMessage: ChatMessage };

export async function requestNextAction(
	messages: ChatMessage[],
	apiKey: string,
	model: string,
): Promise<LLMStep> {
	const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			authorization: `Bearer ${apiKey}`,
			"content-type": "application/json",
			"x-title": "Otto Agent",
		},
		body: JSON.stringify({
			model,
			messages,
			tools: TOOLS,
			tool_choice: "auto",
			temperature: 0.2,
			max_tokens: 600,
		}),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`openrouter_${res.status}: ${text.slice(0, 300)}`);
	}

	const body = (await res.json()) as {
		choices?: Array<{
			message?: {
				content?: string | null;
				tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
			};
		}>;
	};

	const msg = body.choices?.[0]?.message;
	if (!msg) throw new Error("openrouter_empty_response");

	const assistantMessage: ChatMessage = {
		role: "assistant",
		content: msg.content ?? "",
		...(msg.tool_calls?.length ? { tool_calls: msg.tool_calls } : {}),
	};

	const call = msg.tool_calls?.[0];
	if (!call) {
		// Model answered in prose — treat it as say() so the loop still behaves.
		const text = (msg.content ?? "").trim() || "I'm not sure how to proceed — could you rephrase?";
		return { kind: "action", action: { type: "say", text }, assistantMessage };
	}

	let args: Record<string, unknown> = {};
	try {
		args = JSON.parse(call.function.arguments || "{}");
	} catch {
		throw new Error("openrouter_bad_tool_args");
	}

	if (call.function.name === "search_knowledge_base") {
		return { kind: "search", query: String(args.query ?? ""), toolCallId: call.id, assistantMessage };
	}

	const status = typeof args.status === "string" ? args.status : undefined;
	const action = toAction(call.function.name, args);
	return { kind: "action", action, status, assistantMessage };
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
