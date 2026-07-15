import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema.js";

const DEFAULT_DATABASE_URL = "postgres://localhost:5432/otto";

const CREATE_AUTH_TABLES = `
CREATE TABLE IF NOT EXISTS "user" (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	email_verified BOOLEAN NOT NULL DEFAULT false,
	image TEXT,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS user_email_idx ON "user"(email);

CREATE TABLE IF NOT EXISTS "session" (
	id TEXT PRIMARY KEY,
	expires_at TIMESTAMP NOT NULL,
	token TEXT NOT NULL,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL,
	ip_address TEXT,
	user_agent TEXT,
	user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_session_token_idx ON "session"(token);
CREATE INDEX IF NOT EXISTS auth_session_user_idx ON "session"(user_id);

CREATE TABLE IF NOT EXISTS "account" (
	id TEXT PRIMARY KEY,
	account_id TEXT NOT NULL,
	provider_id TEXT NOT NULL,
	user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
	access_token TEXT,
	refresh_token TEXT,
	id_token TEXT,
	access_token_expires_at TIMESTAMP,
	refresh_token_expires_at TIMESTAMP,
	scope TEXT,
	password TEXT,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS account_user_idx ON "account"(user_id);

CREATE TABLE IF NOT EXISTS "verification" (
	id TEXT PRIMARY KEY,
	identifier TEXT NOT NULL,
	value TEXT NOT NULL,
	expires_at TIMESTAMP NOT NULL,
	created_at TIMESTAMP,
	updated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"(identifier);
`;

const CREATE_TENANT_TABLES = `
CREATE TABLE IF NOT EXISTS tenants (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	slug TEXT NOT NULL,
	created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_slug_idx ON tenants(slug);

CREATE TABLE IF NOT EXISTS tenant_members (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
	role TEXT NOT NULL DEFAULT 'member',
	created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_member_unique_idx ON tenant_members(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS tenant_member_user_idx ON tenant_members(user_id);

CREATE TABLE IF NOT EXISTS api_keys (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	created_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	type TEXT NOT NULL,
	mode TEXT NOT NULL,
	key_hash TEXT NOT NULL,
	key_prefix TEXT NOT NULL,
	last_four TEXT NOT NULL,
	created_at BIGINT NOT NULL,
	last_used_at BIGINT,
	revoked_at BIGINT
);
CREATE UNIQUE INDEX IF NOT EXISTS api_key_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_key_tenant_idx ON api_keys(tenant_id);

CREATE TABLE IF NOT EXISTS allowed_origins (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	origin TEXT NOT NULL,
	created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS allowed_origin_unique_idx ON allowed_origins(tenant_id, origin);
`;

const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
	api_key_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL,
	created_at BIGINT NOT NULL,
	updated_at BIGINT NOT NULL,
	title TEXT NOT NULL,
	steps BIGINT NOT NULL,
	source TEXT NOT NULL,
	state TEXT NOT NULL,
	history TEXT NOT NULL,
	local TEXT,
	events TEXT NOT NULL
);
`;

const CREATE_DOCS_TABLE = `
CREATE TABLE IF NOT EXISTS docs (
	id TEXT PRIMARY KEY,
	tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
	url TEXT NOT NULL,
	title TEXT,
	status TEXT NOT NULL,
	error_message TEXT,
	created_at BIGINT NOT NULL,
	updated_at BIGINT NOT NULL
);
`;

const CREATE_CHUNKS_TABLE = `
CREATE TABLE IF NOT EXISTS chunks (
	id TEXT PRIMARY KEY,
	doc_id TEXT NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
	content TEXT NOT NULL,
	embedding TEXT,
	created_at BIGINT NOT NULL
);
`;

const CREATE_MEMORIES_TABLE = `
CREATE TABLE IF NOT EXISTS memories (
	id TEXT PRIMARY KEY,
	tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
	user_key TEXT NOT NULL,
	content TEXT NOT NULL,
	created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS memories_user_key_idx ON memories(user_key);
`;

let db: ReturnType<typeof drizzle<typeof schema>> | undefined;
let initPromise: Promise<void> | undefined;

async function initSchema(sql: SQL): Promise<void> {
	// Postgres supports ADD COLUMN IF NOT EXISTS natively — no need for
	// SQLite's hand-rolled ensureColumn/PRAGMA table_info dance this package
	// used before. Still no real migration runner; additive DDL only.
	await sql.unsafe(CREATE_AUTH_TABLES);
	await sql.unsafe(CREATE_TENANT_TABLES);
	await sql.unsafe(CREATE_SESSIONS_TABLE);
	await sql.unsafe(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;`);
	await sql.unsafe(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS api_key_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL;`);
	await sql.unsafe(CREATE_DOCS_TABLE);
	await sql.unsafe(`ALTER TABLE docs ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;`);
	await sql.unsafe(CREATE_CHUNKS_TABLE);
	await sql.unsafe(CREATE_MEMORIES_TABLE);
	await sql.unsafe(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;`);
}

/**
 * Lazily opens the Postgres connection and ensures the schema exists.
 * Concurrent first callers share one init via initPromise rather than each
 * racing their own CREATE TABLE statements.
 */
export async function getDb(): Promise<ReturnType<typeof drizzle<typeof schema>>> {
	if (db) return db;

	const url = process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
	const sql = new SQL(url);

	if (!initPromise) initPromise = initSchema(sql);
	await initPromise;

	db = drizzle(sql, { schema });
	return db;
}
