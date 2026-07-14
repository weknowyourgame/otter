import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema.js";

/**
 * Default path resolves relative to this package's own location (repo
 * root, three levels up from packages/db/dist), not process.cwd(). Both
 * apps/web and apps/api import this same package, so without this they'd
 * each open their own SQLite file at `./otto.db` under their own cwd and
 * silently diverge — apps/api's sessions would never show up in apps/web's
 * dashboard. OTTO_DB_PATH still overrides this for real deployments.
 */
function defaultDbPath(): string {
	const here = dirname(fileURLToPath(import.meta.url));
	return resolve(here, "../../../.data/otto.db");
}

const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
	api_key_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL,
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

const CREATE_AUTH_TABLES = `
CREATE TABLE IF NOT EXISTS user (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	email_verified INTEGER NOT NULL DEFAULT 0,
	image TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS user_email_idx ON user(email);

CREATE TABLE IF NOT EXISTS session (
	id TEXT PRIMARY KEY,
	expires_at INTEGER NOT NULL,
	token TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	ip_address TEXT,
	user_agent TEXT,
	user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_session_token_idx ON session(token);
CREATE INDEX IF NOT EXISTS auth_session_user_idx ON session(user_id);

CREATE TABLE IF NOT EXISTS account (
	id TEXT PRIMARY KEY,
	account_id TEXT NOT NULL,
	provider_id TEXT NOT NULL,
	user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
	access_token TEXT,
	refresh_token TEXT,
	id_token TEXT,
	access_token_expires_at INTEGER,
	refresh_token_expires_at INTEGER,
	scope TEXT,
	password TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS account_user_idx ON account(user_id);

CREATE TABLE IF NOT EXISTS verification (
	id TEXT PRIMARY KEY,
	identifier TEXT NOT NULL,
	value TEXT NOT NULL,
	expires_at INTEGER NOT NULL,
	created_at INTEGER,
	updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);
`;

const CREATE_TENANT_TABLES = `
CREATE TABLE IF NOT EXISTS tenants (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	slug TEXT NOT NULL,
	created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_slug_idx ON tenants(slug);

CREATE TABLE IF NOT EXISTS tenant_members (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
	role TEXT NOT NULL DEFAULT 'member',
	created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_member_unique_idx ON tenant_members(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS tenant_member_user_idx ON tenant_members(user_id);

CREATE TABLE IF NOT EXISTS api_keys (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	created_by TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	type TEXT NOT NULL,
	mode TEXT NOT NULL,
	key_hash TEXT NOT NULL,
	key_prefix TEXT NOT NULL,
	last_four TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	last_used_at INTEGER,
	revoked_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS api_key_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_key_tenant_idx ON api_keys(tenant_id);

CREATE TABLE IF NOT EXISTS allowed_origins (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	origin TEXT NOT NULL,
	created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS allowed_origin_unique_idx ON allowed_origins(tenant_id, origin);
`;

const CREATE_DOCS_TABLE = `
CREATE TABLE IF NOT EXISTS docs (
	id TEXT PRIMARY KEY,
	tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
	url TEXT NOT NULL,
	title TEXT,
	status TEXT NOT NULL,
	error_message TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
`;

const CREATE_CHUNKS_TABLE = `
CREATE TABLE IF NOT EXISTS chunks (
	id TEXT PRIMARY KEY,
	doc_id TEXT NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
	content TEXT NOT NULL,
	embedding TEXT,
	created_at INTEGER NOT NULL
);
`;

const CREATE_MEMORIES_TABLE = `
CREATE TABLE IF NOT EXISTS memories (
	id TEXT PRIMARY KEY,
	tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
	user_key TEXT NOT NULL,
	content TEXT NOT NULL,
	created_at INTEGER NOT NULL
);
`;

const CREATE_MEMORIES_USER_KEY_INDEX = `
CREATE INDEX IF NOT EXISTS memories_user_key_idx ON memories(user_key);
`;

let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function ensureColumn(
	sqlite: Database,
	table: string,
	column: string,
	definition: string,
): void {
	const columns = sqlite.query(`PRAGMA table_info(${table})`).all() as Array<{
		name: string;
	}>;
	if (!columns.some((entry) => entry.name === column)) {
		sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
	}
}

/**
 * Lazily opens the SQLite file and ensures the schema exists. No migration
 * runner yet — this is a single `CREATE TABLE IF NOT EXISTS`, matching the
 * project's current zero-infra footprint. Swap for drizzle-kit migrations
 * once the schema needs to evolve past additive columns.
 */
export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
	if (db) return db;

	const path = process.env.OTTO_DB_PATH?.trim() || defaultDbPath();
	mkdirSync(dirname(path), { recursive: true });
	const sqlite = new Database(path, { create: true });
	sqlite.exec("PRAGMA journal_mode = WAL;");
	sqlite.exec("PRAGMA foreign_keys = ON;");
	sqlite.exec(CREATE_AUTH_TABLES);
	sqlite.exec(CREATE_TENANT_TABLES);
	sqlite.exec(CREATE_SESSIONS_TABLE);
	ensureColumn(
		sqlite,
		"sessions",
		"tenant_id",
		"TEXT REFERENCES tenants(id) ON DELETE CASCADE",
	);
	ensureColumn(
		sqlite,
		"sessions",
		"api_key_id",
		"TEXT REFERENCES api_keys(id) ON DELETE SET NULL",
	);
	sqlite.exec(CREATE_DOCS_TABLE);
	ensureColumn(
		sqlite,
		"docs",
		"tenant_id",
		"TEXT REFERENCES tenants(id) ON DELETE CASCADE",
	);
	sqlite.exec(CREATE_CHUNKS_TABLE);
	sqlite.exec(CREATE_MEMORIES_TABLE);
	ensureColumn(
		sqlite,
		"memories",
		"tenant_id",
		"TEXT REFERENCES tenants(id) ON DELETE CASCADE",
	);
	sqlite.exec(CREATE_MEMORIES_USER_KEY_INDEX);

	db = drizzle(sqlite, { schema });
	return db;
}
