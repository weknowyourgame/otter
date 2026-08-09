import {
	bigint,
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

// Better Auth owns these four singular tables. Keeping them in Otter's shared
// database lets the API authenticate dashboard requests without introducing a
// second datastore or leaking session state into the Next.js app.
export const user = pgTable(
	"user",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		email: text("email").notNull(),
		emailVerified: boolean("email_verified").notNull().default(false),
		image: text("image"),
		createdAt: timestamp("created_at", { mode: "date" }).notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
	},
	(table) => [uniqueIndex("user_email_idx").on(table.email)],
);

export const authSession = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
		token: text("token").notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
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

export const account = pgTable(
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
		accessTokenExpiresAt: timestamp("access_token_expires_at", {
			mode: "date",
		}),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
			mode: "date",
		}),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at", { mode: "date" }).notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
	},
	(table) => [index("account_user_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
		createdAt: timestamp("created_at", { mode: "date" }),
		updatedAt: timestamp("updated_at", { mode: "date" }),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

// Everything below stores app timestamps as epoch-ms numbers (Date.now()),
// same as before the Postgres migration — kept that way deliberately so no
// consumer's comparison/sorting/serialization logic needed to change, just
// the storage layer. Uses bigint (Postgres int8), not integer (int4): a
// plain `integer` column here silently overflows Postgres's ~2.1B max for
// any real epoch-ms value (current epoch ms is ~1.78 trillion) — SQLite's
// dynamically-sized integers never surfaced this, so it would have been a
// real bug on the very first insert if ported naively.

export const tenants = pgTable(
	"tenants",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		createdAt: bigint("created_at", { mode: "number" }).notNull(),
	},
	(table) => [uniqueIndex("tenant_slug_idx").on(table.slug)],
);

export const tenantMembers = pgTable(
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
		createdAt: bigint("created_at", { mode: "number" }).notNull(),
	},
	(table) => [
		uniqueIndex("tenant_member_unique_idx").on(table.tenantId, table.userId),
		index("tenant_member_user_idx").on(table.userId),
	],
);

/**
 * A pending invitation to join a tenant. Otter's dashboard assumes one
 * tenant per user today (requireDashboard/getTenantForUser both take the
 * first membership found) — accepting a second invite while already
 * belonging to a tenant is rejected rather than silently creating an
 * ambiguous multi-tenant state; revisit if a tenant switcher ever ships.
 */
export const tenantInvites = pgTable(
	"tenant_invites",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		role: text("role", { enum: ["owner", "member"] })
			.notNull()
			.default("member"),
		token: text("token").notNull(),
		invitedBy: text("invited_by")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: bigint("created_at", { mode: "number" }).notNull(),
		expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
		acceptedAt: bigint("accepted_at", { mode: "number" }),
	},
	(table) => [
		uniqueIndex("tenant_invite_token_idx").on(table.token),
		index("tenant_invite_tenant_idx").on(table.tenantId),
	],
);

export type TenantInviteRow = typeof tenantInvites.$inferSelect;
export type NewTenantInviteRow = typeof tenantInvites.$inferInsert;

export const apiKeys = pgTable(
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
		createdAt: bigint("created_at", { mode: "number" }).notNull(),
		lastUsedAt: bigint("last_used_at", { mode: "number" }),
		revokedAt: bigint("revoked_at", { mode: "number" }),
	},
	(table) => [
		uniqueIndex("api_key_hash_idx").on(table.keyHash),
		index("api_key_tenant_idx").on(table.tenantId),
	],
);

export const allowedOrigins = pgTable(
	"allowed_origins",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		origin: text("origin").notNull(),
		createdAt: bigint("created_at", { mode: "number" }).notNull(),
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
 * rather than normalized tables — otter-core already treats them as opaque
 * blobs it serializes wholesale each step. Revisit if step history needs to be
 * queried independently.
 */
export const sessions = pgTable("sessions", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id").references(() => tenants.id, {
		onDelete: "cascade",
	}),
	apiKeyId: text("api_key_id").references(() => apiKeys.id, {
		onDelete: "set null",
	}),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	title: text("title").notNull(),
	steps: bigint("steps", { mode: "number" }).notNull(),
	source: text("source", { enum: ["ai", "local"] }).notNull(),
	state: text("state", { enum: ["active", "done", "failed"] }).notNull(),
	/** JSON-serialized ChatMessage[] (otter-core's LLM conversation history). */
	history: text("history").notNull(),
	/** JSON-serialized LocalPlannerState, present only for keyless-fallback sessions. */
	local: text("local"),
	/** JSON-serialized SessionEvent[] — powers the dashboard step trail. */
	events: text("events").notNull(),
	/**
	 * JSON-serialized TraceStep[] — every action taken, with the clicked
	 * element resolved to {role, name} while the snapshot that produced it is
	 * still in hand. `history` can't serve this: refs die with the page, and
	 * engine.ts blanks superseded snapshots to save tokens. Nullable so rows
	 * written before this column existed still parse.
	 */
	trace: text("trace"),
});

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;

/**
 * A knowledge-base source document. Web docs can represent a bounded website
 * crawl; FAQ/file docs are entered directly. Chunks are embedded so the answer
 * path can retrieve grounded context instead of the agent guessing.
 */
export const docs = pgTable("docs", {
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
	/** Distinguishes crawled web pages from manually-entered FAQ/file knowledge. */
	sourceType: text("source_type", { enum: ["web", "faq", "file"] })
		.notNull()
		.default("web"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type DocRow = typeof docs.$inferSelect;
export type NewDocRow = typeof docs.$inferInsert;

export const chunks = pgTable("chunks", {
	id: text("id").primaryKey(),
	docId: text("doc_id")
		.notNull()
		.references(() => docs.id, { onDelete: "cascade" }),
	content: text("content").notNull(),
	/** JSON-serialized number[]. Null until Phase 8 runs embedding generation. */
	embedding: text("embedding"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type ChunkRow = typeof chunks.$inferSelect;
export type NewChunkRow = typeof chunks.$inferInsert;

/**
 * A durable fact about a user, scoped by userKey (their email — the only
 * identity Otter has today, via OtterConfig.user forwarded on each step).
 * No semantic/embedding-based recall yet — just the most recent facts for
 * that user, injected once at session start. Revisit if the fact count per user grows enough that
 * "most recent N" stops being a good enough recall strategy.
 */
export const memories = pgTable("memories", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id").references(() => tenants.id, {
		onDelete: "cascade",
	}),
	userKey: text("user_key").notNull(),
	content: text("content").notNull(),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type MemoryRow = typeof memories.$inferSelect;
export type NewMemoryRow = typeof memories.$inferInsert;

/**
 * A route that already worked: the user's original intent plus the ordered
 * actions a session took before reaching done(). Distilled from sessions.trace
 * with no LLM call, and retrieved on a new session's first turn as a *hint*.
 *
 * Tenant-scoped, not user-scoped (unlike memories) — a route through a
 * customer's app is the same route for everyone in that workspace, and
 * per-user playbooks would take N successful runs to learn what one teaches.
 * Nothing user-authored is stored: fill values are dropped in trace.ts.
 *
 * Embeddings are JSON text and scored in JS, matching chunks/knowledge.ts.
 * Revisit together with that path if either grows past a linear scan.
 */
export const playbooks = pgTable(
	"playbooks",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		/** Provenance only — no FK, since sessions are swept after 30 days. */
		sessionId: text("session_id").notNull(),
		/** The user's opening message (sessions.title), what we embed against. */
		intent: text("intent").notNull(),
		/** JSON-serialized TraceStep[]. */
		steps: text("steps").notNull(),
		/** JSON-serialized number[]; null if the embedding call failed. */
		embedding: text("embedding"),
		createdAt: bigint("created_at", { mode: "number" }).notNull(),
		updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	},
	(table) => [
		// Re-running the same task overwrites its playbook rather than piling
		// up near-identical rows for every retrieval to sift through.
		uniqueIndex("playbook_tenant_intent_idx").on(table.tenantId, table.intent),
	],
);

export type PlaybookRow = typeof playbooks.$inferSelect;
export type NewPlaybookRow = typeof playbooks.$inferInsert;

/**
 * One row per tenant — Otter has no separate multi-website "agent" concept
 * today, so this is the tenant's single agent configuration. systemPrompt
 * (when set) overrides otter-core's BASE_SYSTEM_PROMPT for that tenant's
 * live sessions; toolSettings is a JSON-serialized Record<string, boolean>
 * keyed by tool label, since the tool set itself is fixed and defined in
 * apps/web, not stored per-row.
 */
export const agents = pgTable(
	"agents",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		name: text("name").notNull().default("Otter Support"),
		model: text("model").notNull().default("openai/gpt-5.3-codex"),
		systemPrompt: text("system_prompt"),
		maxToolCalls: integer("max_tool_calls").notNull().default(6),
		extendedReasoning: boolean("extended_reasoning").notNull().default(true),
		enabled: boolean("enabled").notNull().default(true),
		tonePreset: text("tone_preset").notNull().default("Balanced"),
		voiceTone: text("voice_tone"),
		clarificationPolicy: text("clarification_policy"),
		escalationPolicy: text("escalation_policy"),
		/** JSON-serialized Record<string, boolean>. Null until first save. */
		toolSettings: text("tool_settings"),
		createdAt: bigint("created_at", { mode: "number" }).notNull(),
		updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	},
	(table) => [uniqueIndex("agent_tenant_idx").on(table.tenantId)],
);

export type AgentRow = typeof agents.$inferSelect;
export type NewAgentRow = typeof agents.$inferInsert;

/**
 * One row per billable LLM call (agent turn or embedding), so usage can be
 * summed over any rolling window instead of just an all-time counter — the
 * Plan & Usage page already advertises "rolling 30-day window" copy that
 * needs this. Individual rows aren't queried directly outside aggregation;
 * revisit with a cleanup job if row count ever becomes a real concern.
 */
export const usageEvents = pgTable(
	"usage_events",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		kind: text("kind", { enum: ["agent_step", "embedding"] }).notNull(),
		promptTokens: integer("prompt_tokens").notNull().default(0),
		completionTokens: integer("completion_tokens").notNull().default(0),
		totalTokens: integer("total_tokens").notNull().default(0),
		createdAt: bigint("created_at", { mode: "number" }).notNull(),
	},
	(table) => [
		index("usage_events_tenant_created_idx").on(
			table.tenantId,
			table.createdAt,
		),
	],
);

export type UsageEventRow = typeof usageEvents.$inferSelect;
export type NewUsageEventRow = typeof usageEvents.$inferInsert;
