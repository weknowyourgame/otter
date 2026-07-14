import { desc, eq } from "drizzle-orm";
import { getDb } from "./connection.js";
import { type SessionRow, sessions } from "./schema.js";

/** Sync — bun:sqlite (and drizzle's bun-sqlite driver) are synchronous. */
export function getSession(id: string): SessionRow | undefined {
	return getDb().select().from(sessions).where(eq(sessions.id, id)).get();
}

export function listSessions(limit: number): SessionRow[] {
	return getDb().select().from(sessions).orderBy(desc(sessions.updatedAt)).limit(limit).all();
}
