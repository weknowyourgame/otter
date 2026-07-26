import { defineConfig } from "drizzle-kit";

const DEFAULT_DATABASE_URL = "postgres://localhost:5432/otter";

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema.ts",
	out: "./drizzle",
	dbCredentials: {
		url: process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL,
	},
});
