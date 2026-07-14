// Cross-session memory. Scoped by userKey (the user's email, the only
// identity Otto has via StepRequest.user). No semantic recall like
// cossistant's optional embedding-based memory search — just the user's
// most recent facts, injected once when a session starts.

import { deleteMemory, insertMemory, listMemoriesForUser, type MemoryRow } from "otto-db";

function newMemoryId(): string {
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function rememberFact(userKey: string, content: string): MemoryRow {
	return insertMemory({ id: newMemoryId(), userKey, content, createdAt: Date.now() });
}

/** Returns false if the memory didn't exist (already forgotten, or never belonged to this user). */
export function forgetFact(userKey: string, memoryId: string): boolean {
	const owned = listMemoriesForUser(userKey, 100).some((m) => m.id === memoryId);
	if (!owned) return false;
	return deleteMemory(memoryId);
}

export function loadKnownFacts(userKey: string): MemoryRow[] {
	return listMemoriesForUser(userKey);
}

/** Injected once into a new session's history as an extra system message, with visible IDs so forget() can reference one. */
export function formatKnownFactsForPrompt(facts: MemoryRow[]): string {
	const lines = facts.map((f) => `[${f.id}] ${f.content}`);
	return `Known facts about this user from previous sessions:\n${lines.join("\n")}`;
}
