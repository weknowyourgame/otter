// Bundles apps/api into a single Vercel function under <out>/api/index.mjs.
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve(process.argv[2] ?? "../otter-api-vercel");
mkdirSync(`${out}/api`, { recursive: true });
await build({
	entryPoints: ["apps/api/src/vercel.ts"],
	outfile: `${out}/api/index.mjs`,
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node20",
	sourcemap: false,
	banner: {
		js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
	},
});
writeFileSync(`${out}/package.json`, JSON.stringify({ name: "otter-api", private: true, type: "module" }, null, 2));
writeFileSync(
	`${out}/vercel.json`,
	JSON.stringify(
		{
			rewrites: [{ source: "/(.*)", destination: "/api" }],
			functions: { "api/index.mjs": { maxDuration: 60 } },
		},
		null,
		2,
	),
);
console.log("built", out);
