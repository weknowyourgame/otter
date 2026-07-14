import { lt } from "drizzle-orm";
import { getDb } from "./connection.js";
import { type NewSessionRow, sessions } from "./schema.js";

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
