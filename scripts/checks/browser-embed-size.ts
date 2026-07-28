// Fails the build if otter-sdk's script-tag bundles grow past a budget.
// Raw/gzip regression check for otter-sdk's script-tag bundles. Baselines are
// set to the vanilla TypeScript loader/executor/UI in packages/sdk.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

type AssetName = "otter-loader.global.js" | "otter-widget.global.js";

type AssetThreshold = { raw: number; gzip: number };

// Measured by running this script under bun (the runtime it's meant to run
// under) — node's zlib produces slightly different gzip byte counts for the
// same input, so baselines must be captured with the same tool that checks them.
const BASELINES: Record<AssetName, AssetThreshold> = {
	"otter-loader.global.js": { raw: 1534, gzip: 645 },
	"otter-widget.global.js": { raw: 62_529, gzip: 15_923 },
};

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const distDir = join(repoRoot, "packages/sdk/dist");

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDelta(bytes: number): string {
	if (bytes === 0) return "0 B";
	return `${bytes > 0 ? "+" : ""}${formatBytes(bytes)}`;
}

const warnings: string[] = [];
const errors: string[] = [];

console.log("otter-sdk embed asset sizes");

for (const assetName of Object.keys(BASELINES) as AssetName[]) {
	const assetPath = join(distDir, assetName);

	if (!existsSync(assetPath)) {
		errors.push(
			`Missing embed asset: ${assetName} (run \`bun run --cwd packages/sdk build\` first)`,
		);
		continue;
	}

	const source = readFileSync(assetPath);
	const rawBytes = source.byteLength;
	const gzipBytes = gzipSync(source).byteLength;
	const baseline = BASELINES[assetName];
	const rawDelta = rawBytes - baseline.raw;
	const gzipDelta = gzipBytes - baseline.gzip;

	console.log(
		`- ${assetName}: raw ${formatBytes(rawBytes)} (${formatDelta(rawDelta)}), gzip ${formatBytes(gzipBytes)} (${formatDelta(gzipDelta)})`,
	);

	if (gzipDelta > 0) {
		errors.push(
			`${assetName} gzip regressed by ${formatBytes(gzipDelta)} over the ${formatBytes(baseline.gzip)} baseline`,
		);
	} else if (rawDelta > 0) {
		warnings.push(
			`${assetName} raw size grew by ${formatBytes(rawDelta)} over the ${formatBytes(baseline.raw)} baseline`,
		);
	}
}

for (const warning of warnings) console.warn(`warning: ${warning}`);

if (errors.length > 0) {
	for (const error of errors) console.error(`error: ${error}`);
	process.exit(1);
}
