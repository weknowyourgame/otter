import { build } from "esbuild";

await build({
	entryPoints: ["src/index.ts"],
	outfile: "dist/index.js",
	bundle: true,
	format: "esm",
	platform: "node",
	target: "es2022",
	sourcemap: true,
	external: ["ioredis"],
});

console.log("otto-redis built -> dist/index.js");
