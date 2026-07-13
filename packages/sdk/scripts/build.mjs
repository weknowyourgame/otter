import { rmSync } from "node:fs";
import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });

const common = {
	bundle: true,
	sourcemap: true,
	target: "es2020",
	logLevel: "info",
};

const esm = {
	...common,
	entryPoints: ["src/index.ts"],
	format: "esm",
	outfile: "dist/otto-sdk.esm.js",
};
const global = {
	...common,
	entryPoints: ["src/global.ts"],
	format: "iife",
	globalName: "Otto",
	outfile: "dist/otto-sdk.global.js",
};

if (watch) {
	const ctxEsm = await esbuild.context(esm);
	const ctxGlobal = await esbuild.context(global);
	await Promise.all([ctxEsm.watch(), ctxGlobal.watch()]);
	console.log("Watching for changes...");
} else {
	await Promise.all([esbuild.build(esm), esbuild.build(global)]);
	console.log("Build complete.");
}
