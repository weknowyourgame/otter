import { eq, lt } from "drizzle-orm";
import { getDb } from "./connection.js";
import { type ChunkRow, chunks, type DocRow, docs, type NewChunkRow, type NewDocRow, type NewSessionRow, sessions } from "./schema.js";

export function upsertSession(row: NewSessionRow): void {
	getDb()
		.insert(sessions)
		.values(row)
		.onConflictDoUpdate({
			target: sessions.id,
			set: {
				updatedAt: row.updatedAt,
				title: row.title,
				steps: row.steps,
				source: row.source,
				state: row.state,
				history: row.history,
				local: row.local,
				events: row.events,
			},
		})
		.run();
}

export function deleteExpiredSessions(olderThanUpdatedAt: number): void {
	getDb().delete(sessions).where(lt(sessions.updatedAt, olderThanUpdatedAt)).run();
}

export function insertDoc(row: NewDocRow): DocRow {
	return getDb().insert(docs).values(row).returning().get();
}

export function updateDocStatus(
	id: string,
	patch: { status: DocRow["status"]; title?: string | null; errorMessage?: string | null; updatedAt: number },
): void {
	getDb()
		.update(docs)
		.set({ status: patch.status, title: patch.title, errorMessage: patch.errorMessage, updatedAt: patch.updatedAt })
		.where(eq(docs.id, id))
		.run();
}

export function replaceChunksForDoc(docId: string, rows: NewChunkRow[]): ChunkRow[] {
	const db = getDb();
	db.delete(chunks).where(eq(chunks.docId, docId)).run();
	if (rows.length === 0) return [];
	return db.insert(chunks).values(rows).returning().all();
}

export function setChunkEmbedding(id: string, embedding: string): void {
	getDb().update(chunks).set({ embedding }).where(eq(chunks.id, id)).run();
}
