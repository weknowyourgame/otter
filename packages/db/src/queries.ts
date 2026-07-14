import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "./connection.js";
import {
	type ChunkRow,
	chunks,
	type DocRow,
	docs,
	type MemoryRow,
	memories,
	type SessionRow,
	sessions,
} from "./schema.js";

/** Sync — bun:sqlite (and drizzle's bun-sqlite driver) are synchronous. */
export function getSession(id: string): SessionRow | undefined {
	return getDb().select().from(sessions).where(eq(sessions.id, id)).get();
}

export function listSessions(limit: number, tenantId?: string): SessionRow[] {
	const query = getDb().select().from(sessions);
	return (tenantId ? query.where(eq(sessions.tenantId, tenantId)) : query)
		.orderBy(desc(sessions.updatedAt))
		.limit(limit)
		.all();
}

export function getDoc(id: string, tenantId?: string): DocRow | undefined {
	return getDb()
		.select()
		.from(docs)
		.where(
			tenantId
				? and(eq(docs.id, id), eq(docs.tenantId, tenantId))
				: eq(docs.id, id),
		)
		.get();
}

export function listDocs(limit = 100, tenantId?: string): DocRow[] {
	const query = getDb().select().from(docs);
	return (tenantId ? query.where(eq(docs.tenantId, tenantId)) : query)
		.orderBy(desc(docs.createdAt))
		.limit(limit)
		.all();
}

export function listChunksForDoc(docId: string): ChunkRow[] {
	return getDb()
		.select()
		.from(chunks)
		.where(eq(chunks.docId, docId))
		.orderBy(asc(chunks.createdAt))
		.all();
}

/** All chunks across all docs — Phase 8's embedding step and retrieval will page through this. */
export function listAllChunks(tenantId?: string): ChunkRow[] {
	if (!tenantId) return getDb().select().from(chunks).all();
	return getDb()
		.select({
			id: chunks.id,
			docId: chunks.docId,
			content: chunks.content,
			embedding: chunks.embedding,
			createdAt: chunks.createdAt,
		})
		.from(chunks)
		.innerJoin(docs, eq(chunks.docId, docs.id))
		.where(eq(docs.tenantId, tenantId))
		.all();
}

/** Most recent facts for a user, newest first — injected once at session start. */
export function listMemoriesForUser(
	userKey: string,
	limit = 20,
	tenantId?: string,
): MemoryRow[] {
	return getDb()
		.select()
		.from(memories)
		.where(
			tenantId
				? and(eq(memories.userKey, userKey), eq(memories.tenantId, tenantId))
				: eq(memories.userKey, userKey),
		)
		.orderBy(desc(memories.createdAt))
		.limit(limit)
		.all();
}
