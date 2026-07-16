import { and, eq, lt } from "drizzle-orm";
import { getDb } from "./connection.js";
import {
	type AgentRow,
	agents,
	type ChunkRow,
	chunks,
	type DocRow,
	docs,
	type MemoryRow,
	memories,
	type NewAgentRow,
	type NewChunkRow,
	type NewDocRow,
	type NewMemoryRow,
	type NewSessionRow,
	type NewUsageEventRow,
	sessions,
	usageEvents,
} from "./schema.js";

export async function upsertSession(row: NewSessionRow): Promise<void> {
	const db = await getDb();
	await db
		.insert(sessions)
		.values(row)
		.onConflictDoUpdate({
			target: sessions.id,
			set: {
				tenantId: row.tenantId,
				apiKeyId: row.apiKeyId,
				updatedAt: row.updatedAt,
				title: row.title,
				steps: row.steps,
				source: row.source,
				state: row.state,
				history: row.history,
				local: row.local,
				events: row.events,
			},
		});
}

export async function deleteExpiredSessions(olderThanUpdatedAt: number): Promise<void> {
	const db = await getDb();
	await db.delete(sessions).where(lt(sessions.updatedAt, olderThanUpdatedAt));
}

export async function insertDoc(row: NewDocRow): Promise<DocRow> {
	const db = await getDb();
	const rows = await db.insert(docs).values(row).returning();
	return rows[0] as DocRow;
}

export async function updateDocStatus(
	id: string,
	patch: { status: DocRow["status"]; title?: string | null; errorMessage?: string | null; updatedAt: number },
): Promise<void> {
	const db = await getDb();
	await db
		.update(docs)
		.set({ status: patch.status, title: patch.title, errorMessage: patch.errorMessage, updatedAt: patch.updatedAt })
		.where(eq(docs.id, id));
}

export async function replaceChunksForDoc(docId: string, rows: NewChunkRow[]): Promise<ChunkRow[]> {
	const db = await getDb();
	await db.delete(chunks).where(eq(chunks.docId, docId));
	if (rows.length === 0) return [];
	return db.insert(chunks).values(rows).returning();
}

export async function setChunkEmbedding(id: string, embedding: string): Promise<void> {
	const db = await getDb();
	await db.update(chunks).set({ embedding }).where(eq(chunks.id, id));
}

/** Returns true if a row was actually deleted (tenant-scoped, so cross-tenant deletes are impossible). */
export async function deleteDoc(
	id: string,
	tenantId: string,
): Promise<boolean> {
	const db = await getDb();
	const deleted = await db
		.delete(docs)
		.where(and(eq(docs.id, id), eq(docs.tenantId, tenantId)))
		.returning({ id: docs.id });
	return deleted.length > 0;
}

/** One row per tenant — creates on first save, otherwise updates in place. */
export async function upsertAgent(row: NewAgentRow): Promise<AgentRow> {
	const db = await getDb();
	const rows = await db
		.insert(agents)
		.values(row)
		.onConflictDoUpdate({
			target: agents.tenantId,
			set: {
				name: row.name,
				model: row.model,
				systemPrompt: row.systemPrompt,
				maxToolCalls: row.maxToolCalls,
				extendedReasoning: row.extendedReasoning,
				enabled: row.enabled,
				tonePreset: row.tonePreset,
				voiceTone: row.voiceTone,
				clarificationPolicy: row.clarificationPolicy,
				escalationPolicy: row.escalationPolicy,
				toolSettings: row.toolSettings,
				updatedAt: row.updatedAt,
			},
		})
		.returning();
	return rows[0] as AgentRow;
}

/** Best-effort by design — a failed usage insert must never break the agent turn or embedding call it's recording. */
export async function insertUsageEvent(row: NewUsageEventRow): Promise<void> {
	try {
		const db = await getDb();
		await db.insert(usageEvents).values(row);
	} catch (error) {
		console.error("[usage] failed to record usage event", error);
	}
}

export async function insertMemory(row: NewMemoryRow): Promise<MemoryRow> {
	const db = await getDb();
	const rows = await db.insert(memories).values(row).returning();
	return rows[0] as MemoryRow;
}

/** Returns true if a row was actually deleted, so a forget-tool call can report "nothing to forget" honestly. */
export async function deleteMemory(id: string, tenantId?: string): Promise<boolean> {
	const db = await getDb();
	const deleted = await db
		.delete(memories)
		.where(tenantId ? and(eq(memories.id, id), eq(memories.tenantId, tenantId)) : eq(memories.id, id))
		.returning({ id: memories.id });
	return deleted.length > 0;
}
