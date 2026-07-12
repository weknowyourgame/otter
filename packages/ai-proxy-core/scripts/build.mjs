import { rmSync } from "node:fs";
import esbuild from "esbuild";

rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });

await esbuild.build({
	entryPoints: ["src/index.ts"],
	bundle: false,
	format: "esm",
	platform: "node",
	target: "es2020",
	outfile: "dist/index.js",
});

console.log("Build complete.");
