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
// The tiny bootstrap a customer's <script src> actually points at — kept
// separate so it can be cached forever while the runtime below is
// version-pinned. See src/loader.ts.
const loader = {
	...common,
	entryPoints: ["src/loader.ts"],
	format: "iife",
	outfile: "dist/otto-loader.global.js",
};
// The real runtime, lazy-loaded by the loader next to it.
const widget = {
	...common,
	entryPoints: ["src/widget-runtime.ts"],
	format: "iife",
	outfile: "dist/otto-widget.global.js",
};

const builds = [esm, loader, widget];

if (watch) {
	const contexts = await Promise.all(builds.map((cfg) => esbuild.context(cfg)));
	await Promise.all(contexts.map((ctx) => ctx.watch()));
	console.log("Watching for changes...");
} else {
	await Promise.all(builds.map((cfg) => esbuild.build(cfg)));
	console.log("Build complete.");
}
