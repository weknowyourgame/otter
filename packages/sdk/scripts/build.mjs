import { rmSync } from "node:fs";
import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });

const common = {
	entryPoints: ["src/index.ts"],
	bundle: true,
	sourcemap: true,
	target: "es2019",
	logLevel: "info",
};

const esm = { ...common, format: "esm", outfile: "dist/ai-widget-sdk.esm.js" };
const global = {
	...common,
	format: "iife",
	globalName: "AIWidgetSDK",
	outfile: "dist/ai-widget-sdk.global.js",
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
