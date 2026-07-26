import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import * as schema from "./schema.js";

const DEFAULT_DATABASE_URL = "postgres://localhost:5432/otter";

// Migrations live in packages/db/drizzle (generated via `bunx drizzle-kit
// generate`, run from packages/db). The existing dev/prod database was
// baselined once via scripts/baseline-migrations.ts to mark the initial
// migration as already applied — see that script's comment for why. New
// schema changes: edit schema.ts, run `bunx drizzle-kit generate`, commit
// the generated migration; migrate() below applies it on next connect.
const MIGRATIONS_FOLDER = `${import.meta.dir}/../drizzle`;

let db: ReturnType<typeof drizzle<typeof schema>> | undefined;
let initPromise: Promise<void> | undefined;

/**
 * Lazily opens the Postgres connection and runs any pending migrations.
 * Concurrent first callers share one init via initPromise rather than each
 * racing their own migration run.
 */
export async function getDb(): Promise<
	ReturnType<typeof drizzle<typeof schema>>
> {
	if (db) return db;

	const url = process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
	const sql = new SQL(url);
	const instance = drizzle(sql, { schema });

	if (!initPromise) {
		initPromise = migrate(instance, { migrationsFolder: MIGRATIONS_FOLDER });
	}
	await initPromise;

	db = instance;
	return db;
}
