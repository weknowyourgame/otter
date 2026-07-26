// Retrieval for the answer path. No vector-index extension (sqlite-vec etc)
// — cosine similarity in JS over otter-db's chunk rows, matching the
// zero-infra approach the rest of this repo has used since Phase 3. Fine at
// today's scale; revisit if the chunk count grows enough to make a linear
// scan slow.

import { listAllChunks } from "otter-db";
import { requestEmbedding } from "./embeddings.js";

const TOP_K = 4;
/**
 * Cosine similarity below this is treated as "nothing relevant" — a
 * knowledge gap — rather than handing the model a weak match it might
 * present as a confident answer. Not tuned against real query data yet;
 * revisit once there's usage to calibrate against.
 */
const RELEVANCE_THRESHOLD = 0.3;

export interface KnowledgeMatch {
	content: string;
	score: number;
}

export interface KnowledgeSearchResult {
	matches: KnowledgeMatch[];
	/** True when nothing cleared RELEVANCE_THRESHOLD — the model should say it doesn't know, not guess. */
	gap: boolean;
}

function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0;
	let normA = 0;
	let normB = 0;
	const length = Math.min(a.length, b.length);
	for (let i = 0; i < length; i++) {
		const ai = a[i] ?? 0;
		const bi = b[i] ?? 0;
		dot += ai * bi;
		normA += ai * ai;
		normB += bi * bi;
	}
	if (normA === 0 || normB === 0) return 0;
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchKnowledgeBase(
	query: string,
	apiKey: string,
	tenantId?: string,
): Promise<KnowledgeSearchResult> {
	const rows = (await listAllChunks(tenantId)).filter((row) => row.embedding);
	if (rows.length === 0) return { matches: [], gap: true };

	const queryEmbedding = await requestEmbedding(query, apiKey);

	const scored = rows.map((row) => ({
		content: row.content,
		score: cosineSimilarity(
			queryEmbedding,
			JSON.parse(row.embedding as string) as number[],
		),
	}));
	scored.sort((a, b) => b.score - a.score);

	const matches = scored
		.slice(0, TOP_K)
		.filter((m) => m.score >= RELEVANCE_THRESHOLD);
	return { matches, gap: matches.length === 0 };
}

export function formatKnowledgeResultForModel(
	result: KnowledgeSearchResult,
): string {
	if (result.gap) {
		return "No relevant information found in the knowledge base. Do not guess — tell the user honestly that you don't have documentation on this.";
	}
	return result.matches
		.map((m, i) => `[${i + 1}] (relevance ${m.score.toFixed(2)})\n${m.content}`)
		.join("\n\n");
}
