import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "./connection.js";
import { type ChunkRow, chunks, type DocRow, docs, type SessionRow, sessions } from "./schema.js";

/** Sync — bun:sqlite (and drizzle's bun-sqlite driver) are synchronous. */
export function getSession(id: string): SessionRow | undefined {
	return getDb().select().from(sessions).where(eq(sessions.id, id)).get();
}

export function listSessions(limit: number): SessionRow[] {
	return getDb().select().from(sessions).orderBy(desc(sessions.updatedAt)).limit(limit).all();
}

export function getDoc(id: string): DocRow | undefined {
	return getDb().select().from(docs).where(eq(docs.id, id)).get();
}

export function listDocs(limit = 100): DocRow[] {
	return getDb().select().from(docs).orderBy(desc(docs.createdAt)).limit(limit).all();
}

export function listChunksForDoc(docId: string): ChunkRow[] {
	return getDb().select().from(chunks).where(eq(chunks.docId, docId)).orderBy(asc(chunks.createdAt)).all();
}

/** All chunks across all docs — Phase 8's embedding step and retrieval will page through this. */
export function listAllChunks(): ChunkRow[] {
	return getDb().select().from(chunks).all();
}
