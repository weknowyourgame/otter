import { build } from "esbuild";

await build({
	entryPoints: ["src/index.ts"],
	outfile: "dist/index.js",
	bundle: true,
	format: "esm",
	platform: "neutral",
	target: "es2022",
	sourcemap: true,
	// otto-db pulls in bun:sqlite (a Bun runtime builtin, not a bundleable
	// npm package) — keep it external and let the workspace symlink resolve
	// it at runtime instead of trying to bundle it under platform:"neutral".
	external: ["otto-db"],
});

console.log("otto-core built -> dist/index.js");
