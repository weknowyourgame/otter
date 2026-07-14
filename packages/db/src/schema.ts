import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Better Auth owns these four singular tables. Keeping them in Otto's shared
// database lets the API authenticate dashboard requests without introducing a
// second datastore or leaking session state into the Next.js app.
export const user = sqliteTable(
	"user",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		email: text("email").notNull(),
		emailVerified: integer("email_verified", { mode: "boolean" })
			.notNull()
			.default(false),
		image: text("image"),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [uniqueIndex("user_email_idx").on(table.email)],
);

export const authSession = sqliteTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
		token: text("token").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		uniqueIndex("auth_session_token_idx").on(table.token),
		index("auth_session_user_idx").on(table.userId),
	],
);

export const account = sqliteTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: integer("access_token_expires_at", {
			mode: "timestamp",
		}),
		refreshTokenExpiresAt: integer("refresh_token_expires_at", {
			mode: "timestamp",
		}),
		scope: text("scope"),
		password: text("password"),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [index("account_user_idx").on(table.userId)],
);

export const verification = sqliteTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp" }),
		updatedAt: integer("updated_at", { mode: "timestamp" }),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const tenants = sqliteTable(
	"tenants",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [uniqueIndex("tenant_slug_idx").on(table.slug)],
);

export const tenantMembers = sqliteTable(
	"tenant_members",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role", { enum: ["owner", "member"] })
			.notNull()
			.default("member"),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [
		uniqueIndex("tenant_member_unique_idx").on(table.tenantId, table.userId),
		index("tenant_member_user_idx").on(table.userId),
	],
);

export const apiKeys = sqliteTable(
	"api_keys",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		createdBy: text("created_by")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		type: text("type", { enum: ["public", "secret"] }).notNull(),
		mode: text("mode", { enum: ["test", "live"] }).notNull(),
		keyHash: text("key_hash").notNull(),
		keyPrefix: text("key_prefix").notNull(),
		lastFour: text("last_four").notNull(),
		createdAt: integer("created_at").notNull(),
		lastUsedAt: integer("last_used_at"),
		revokedAt: integer("revoked_at"),
	},
	(table) => [
		uniqueIndex("api_key_hash_idx").on(table.keyHash),
		index("api_key_tenant_idx").on(table.tenantId),
	],
);

export const allowedOrigins = sqliteTable(
	"allowed_origins",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		origin: text("origin").notNull(),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [
		uniqueIndex("allowed_origin_unique_idx").on(table.tenantId, table.origin),
	],
);

export type UserRow = typeof user.$inferSelect;
export type AuthSessionRow = typeof authSession.$inferSelect;
export type TenantRow = typeof tenants.$inferSelect;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type NewApiKeyRow = typeof apiKeys.$inferInsert;
export type NewAllowedOriginRow = typeof allowedOrigins.$inferInsert;

/**
 * One row per agent session. history/local/events are stored as JSON text
 * rather than normalized tables — otto-core already treats them as opaque
 * blobs it serializes wholesale each step, and Otto's session count/lifetime
 * doesn't justify the join complexity Cossistant's conversation/message split
 * solves for. Revisit if step history needs to be queried independently.
 */
export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id").references(() => tenants.id, {
		onDelete: "cascade",
	}),
	apiKeyId: text("api_key_id").references(() => apiKeys.id, {
		onDelete: "set null",
	}),
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
	tenantId: text("tenant_id").references(() => tenants.id, {
		onDelete: "cascade",
	}),
	url: text("url").notNull(),
	title: text("title"),
	status: text("status", {
		enum: ["pending", "crawling", "ready", "failed"],
	}).notNull(),
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
	tenantId: text("tenant_id").references(() => tenants.id, {
		onDelete: "cascade",
	}),
	userKey: text("user_key").notNull(),
	content: text("content").notNull(),
	createdAt: integer("created_at").notNull(),
});

export type MemoryRow = typeof memories.$inferSelect;
export type NewMemoryRow = typeof memories.$inferInsert;
