#!/usr/bin/env bun
// Truncates every otto-db table for a clean demo slate. Order doesn't matter
// for FK dependencies since TRUNCATE ... CASCADE handles that, but the list
// mirrors schema.ts's table set so it stays obvious if a table is missing.
import { SQL } from "bun";

const DEFAULT_DATABASE_URL = "postgres://localhost:5432/otto";

const TABLES = [
	"sessions",
	"docs",
	"chunks",
	"memories",
	"api_keys",
	"allowed_origins",
	"tenant_members",
	"tenants",
	"account",
	"session",
	"verification",
	"user",
];

async function main() {
	const url = process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
	const sql = new SQL(url);

	const quotedTables = TABLES.map((name) => `"${name}"`).join(", ");
	await sql.unsafe(`TRUNCATE TABLE ${quotedTables} CASCADE;`);

	console.log(`Truncated ${TABLES.length} otto-db tables:`);
	for (const table of TABLES) console.log(`  - ${table}`);

	await sql.end();
}

main().catch((err) => {
	console.error("db reset failed:", err);
	process.exit(1);
});
