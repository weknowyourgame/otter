import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema.js";

const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	title TEXT NOT NULL,
	steps INTEGER NOT NULL,
	source TEXT NOT NULL,
	state TEXT NOT NULL,
	history TEXT NOT NULL,
	local TEXT,
	events TEXT NOT NULL
);
`;

let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * Lazily opens the SQLite file and ensures the schema exists. No migration
 * runner yet — this is a single `CREATE TABLE IF NOT EXISTS`, matching the
 * project's current zero-infra footprint. Swap for drizzle-kit migrations
 * once the schema needs to evolve past additive columns.
 */
export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
	if (db) return db;

	const path = process.env.OTTO_DB_PATH?.trim() || "./otto.db";
	const sqlite = new Database(path, { create: true });
	sqlite.exec("PRAGMA journal_mode = WAL;");
	sqlite.exec(CREATE_SESSIONS_TABLE);

	db = drizzle(sqlite, { schema });
	return db;
}
