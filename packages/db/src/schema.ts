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
