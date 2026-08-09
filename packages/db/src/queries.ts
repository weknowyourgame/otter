import { and, asc, count, desc, eq, gte, sum } from "drizzle-orm";
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
	type PlaybookRow,
	playbooks,
	type SessionRow,
	sessions,
	tenantMembers,
	usageEvents,
} from "./schema.js";

/** Async now — postgres (drizzle-orm/bun-sql) has no synchronous driver, unlike bun:sqlite. */
export async function getSession(id: string): Promise<SessionRow | undefined> {
	const db = await getDb();
	const rows = await db
		.select()
		.from(sessions)
		.where(eq(sessions.id, id))
		.limit(1);
	return rows[0];
}

export async function listSessions(
	limit: number,
	tenantId?: string,
): Promise<SessionRow[]> {
	const db = await getDb();
	const query = db.select().from(sessions);
	return (tenantId ? query.where(eq(sessions.tenantId, tenantId)) : query)
		.orderBy(desc(sessions.updatedAt))
		.limit(limit);
}

export async function getDoc(
	id: string,
	tenantId?: string,
): Promise<DocRow | undefined> {
	const db = await getDb();
	const rows = await db
		.select()
		.from(docs)
		.where(
			tenantId
				? and(eq(docs.id, id), eq(docs.tenantId, tenantId))
				: eq(docs.id, id),
		)
		.limit(1);
	return rows[0];
}

export async function listDocs(
	limit = 100,
	tenantId?: string,
): Promise<DocRow[]> {
	const db = await getDb();
	const query = db.select().from(docs);
	return (tenantId ? query.where(eq(docs.tenantId, tenantId)) : query)
		.orderBy(desc(docs.createdAt))
		.limit(limit);
}

export async function listDocsBySourceType(
	sourceType: DocRow["sourceType"],
	tenantId: string,
	limit = 200,
): Promise<DocRow[]> {
	const db = await getDb();
	return db
		.select()
		.from(docs)
		.where(and(eq(docs.tenantId, tenantId), eq(docs.sourceType, sourceType)))
		.orderBy(desc(docs.createdAt))
		.limit(limit);
}

export async function listChunksForDoc(docId: string): Promise<ChunkRow[]> {
	const db = await getDb();
	return db
		.select()
		.from(chunks)
		.where(eq(chunks.docId, docId))
		.orderBy(asc(chunks.createdAt));
}

/** All chunks across all docs — Phase 8's embedding step and retrieval will page through this. */
export async function listAllChunks(tenantId?: string): Promise<ChunkRow[]> {
	const db = await getDb();
	if (!tenantId) return db.select().from(chunks);
	return db
		.select({
			id: chunks.id,
			docId: chunks.docId,
			content: chunks.content,
			embedding: chunks.embedding,
			createdAt: chunks.createdAt,
		})
		.from(chunks)
		.innerJoin(docs, eq(chunks.docId, docs.id))
		.where(eq(docs.tenantId, tenantId));
}

export type TenantUsageSummary = {
	requests: number;
	totalTokens: number;
	conversations: number;
	teamMembers: number;
};

/** Rolling-window usage summary — powers the Plan & Usage page and the sidebar usage card. */
export async function getTenantUsageSummary(
	tenantId: string,
	sinceMs: number,
): Promise<TenantUsageSummary> {
	const db = await getDb();
	const [usageRow] = await db
		.select({ requests: count(), totalTokens: sum(usageEvents.totalTokens) })
		.from(usageEvents)
		.where(
			and(
				eq(usageEvents.tenantId, tenantId),
				gte(usageEvents.createdAt, sinceMs),
			),
		);
	const [conversationsRow] = await db
		.select({ conversations: count() })
		.from(sessions)
		.where(
			and(eq(sessions.tenantId, tenantId), gte(sessions.createdAt, sinceMs)),
		);
	const [membersRow] = await db
		.select({ teamMembers: count() })
		.from(tenantMembers)
		.where(eq(tenantMembers.tenantId, tenantId));
	return {
		requests: usageRow?.requests ?? 0,
		totalTokens: Number(usageRow?.totalTokens ?? 0),
		conversations: conversationsRow?.conversations ?? 0,
		teamMembers: membersRow?.teamMembers ?? 0,
	};
}

export async function getAgentByTenant(
	tenantId: string,
): Promise<AgentRow | undefined> {
	const db = await getDb();
	const rows = await db
		.select()
		.from(agents)
		.where(eq(agents.tenantId, tenantId))
		.limit(1);
	return rows[0];
}

/**
 * Every playbook for a tenant. Scored in JS by otter-core (same linear scan
 * as listAllChunks) — bounded by `limit` so one workspace with a long tail of
 * one-off tasks can't turn every new session into an unbounded read.
 */
export async function listPlaybooks(
	tenantId: string,
	limit = 200,
): Promise<PlaybookRow[]> {
	const db = await getDb();
	return db
		.select()
		.from(playbooks)
		.where(eq(playbooks.tenantId, tenantId))
		.orderBy(desc(playbooks.updatedAt))
		.limit(limit);
}

/** Most recent facts for a user, newest first — injected once at session start. */
export async function listMemoriesForUser(
	userKey: string,
	limit = 20,
	tenantId?: string,
): Promise<MemoryRow[]> {
	const db = await getDb();
	return db
		.select()
		.from(memories)
		.where(
			tenantId
				? and(eq(memories.userKey, userKey), eq(memories.tenantId, tenantId))
				: eq(memories.userKey, userKey),
		)
		.orderBy(desc(memories.createdAt))
		.limit(limit);
}
