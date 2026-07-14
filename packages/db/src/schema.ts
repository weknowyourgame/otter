import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * One row per agent session. history/local/events are stored as JSON text
 * rather than normalized tables — otto-core already treats them as opaque
 * blobs it serializes wholesale each step, and Otto's session count/lifetime
 * doesn't justify the join complexity Cossistant's conversation/message split
 * solves for. Revisit if step history needs to be queried independently.
 */
export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
	title: text("title").notNull(),
	steps: integer("steps").notNull(),
	source: text("source", { enum: ["ai", "local"] }).notNull(),
	state: text("state", { enum: ["active", "done", "failed"] }).notNull(),
	/** JSON-serialized ChatMessage[] (otto-core's LLM conversation history). */
	history: text("history").notNull(),
	/** JSON-serialized LocalPlannerState, present only for keyless-fallback sessions. */
	local: text("local"),
	/** JSON-serialized SessionEvent[] — powers the dashboard step trail. */
	events: text("events").notNull(),
});

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;

/**
 * A knowledge-base source document (today: one scraped URL). Chunked and
 * embedded (embedding populated by Phase 8, null until then) so the answer
 * path can retrieve grounded context instead of the agent guessing.
 */
export const docs = sqliteTable("docs", {
	id: text("id").primaryKey(),
	url: text("url").notNull(),
	title: text("title"),
	status: text("status", { enum: ["pending", "crawling", "ready", "failed"] }).notNull(),
	errorMessage: text("error_message"),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});

export type DocRow = typeof docs.$inferSelect;
export type NewDocRow = typeof docs.$inferInsert;

export const chunks = sqliteTable("chunks", {
	id: text("id").primaryKey(),
	docId: text("doc_id")
		.notNull()
		.references(() => docs.id, { onDelete: "cascade" }),
	content: text("content").notNull(),
	/** JSON-serialized number[]. Null until Phase 8 runs embedding generation. */
	embedding: text("embedding"),
	createdAt: integer("created_at").notNull(),
});

export type ChunkRow = typeof chunks.$inferSelect;
export type NewChunkRow = typeof chunks.$inferInsert;

/**
 * A durable fact about a user, scoped by userKey (their email — the only
 * identity Otto has today, via OttoConfig.user forwarded on each step).
 * No semantic/embedding-based recall like cossistant's optional
 * models.embed — just the most recent facts for that user, injected once
 * at session start. Revisit if the fact count per user grows enough that
 * "most recent N" stops being a good enough recall strategy.
 */
export const memories = sqliteTable("memories", {
	id: text("id").primaryKey(),
	userKey: text("user_key").notNull(),
	content: text("content").notNull(),
	createdAt: integer("created_at").notNull(),
});

export type MemoryRow = typeof memories.$inferSelect;
export type NewMemoryRow = typeof memories.$inferInsert;
