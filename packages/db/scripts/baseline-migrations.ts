#!/usr/bin/env bun
// One-time script: marks the initial drizzle migration as already applied
// against a database that already has every table (created via the old
// hand-rolled CREATE TABLE IF NOT EXISTS/ALTER TABLE blocks in
// connection.ts). Without this, drizzle-orm's migrate() would try to
// CREATE TABLE against tables that already exist and fail. Never run this
// against a genuinely fresh database — let migrate() create everything
// normally there.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { SQL } from "bun";

const DEFAULT_DATABASE_URL = "postgres://localhost:5432/otter";
const MIGRATIONS_DIR = `${import.meta.dir}/../drizzle`;

async function main() {
	const url = process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
	const sql = new SQL(url);

	const journal = JSON.parse(
		readFileSync(`${MIGRATIONS_DIR}/meta/_journal.json`, "utf8"),
	) as { entries: { tag: string; when: number }[] };

	await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "drizzle";`);
	await sql.unsafe(`
		CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
			id SERIAL PRIMARY KEY,
			hash text NOT NULL,
			created_at bigint
		);
	`);

	for (const entry of journal.entries) {
		const migrationSql = readFileSync(
			`${MIGRATIONS_DIR}/${entry.tag}.sql`,
			"utf8",
		);
		const hash = createHash("sha256").update(migrationSql).digest("hex");
		const existing = await sql`
			SELECT id FROM "drizzle"."__drizzle_migrations" WHERE hash = ${hash}
		`;
		if (existing.length > 0) {
			console.log(`Already baselined: ${entry.tag}`);
			continue;
		}
		await sql`
			INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
			VALUES (${hash}, ${entry.when})
		`;
		console.log(`Baselined: ${entry.tag}`);
	}

	await sql.end();
}

main().catch((err) => {
	console.error("baseline failed:", err);
	process.exit(1);
});
