// Turns the action the model just chose into a durable record, while the
// snapshot that produced it is still in hand. This has to happen here and
// nowhere later: engine.ts blanks superseded snapshots out of history to save
// tokens, and the SDK's `ref` is a per-page WeakMap index that means nothing
// in another session. Without this step a stored session says only *that*
// something was clicked.

import type { AgentAction, PageSnapshot, TraceStep } from "./types.js";

/** Keeps a pathological session from growing an unbounded JSON blob. */
const MAX_TRACE_STEPS = 100;

export function describeAction(
	action: AgentAction,
	snapshot: PageSnapshot,
): TraceStep | undefined {
	const at = Date.now();
	const path = snapshot.path;

	if (action.type === "navigate") {
		return { at, path, type: "navigate", to: action.path };
	}
	if (
		action.type !== "click" &&
		action.type !== "fill" &&
		action.type !== "scroll"
	) {
		// say/done/fail aren't route steps — the summary/reason is already in events.
		return undefined;
	}

	const el = snapshot.elements.find((e) => e.ref === action.ref);
	// A ref the model invented isn't a step that happened; the executor will
	// report the failure separately.
	if (!el) return undefined;

	// Deliberately no action.value — see TraceStep's doc comment.
	return { at, path, type: action.type, role: el.role, name: el.name };
}

export function appendTraceStep(trace: TraceStep[], step: TraceStep): void {
	trace.push(step);
	if (trace.length > MAX_TRACE_STEPS)
		trace.splice(0, trace.length - MAX_TRACE_STEPS);
}
