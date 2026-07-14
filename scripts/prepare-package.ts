// Rewrites a package's dist/package.json for npm publishing: resolves
// workspace:* dependencies to real semver versions, rewrites main/module/
// types/exports to be relative to dist/ (since this package.json will live
// inside it), and strips scripts/devDependencies/files which don't belong
// in a published package.
//
// Adapted from cossistant/scripts/prepare-package.ts, but Otto's packages
// hand-author `exports` pointing straight at built files (e.g.
// "./dist/otto-sdk.esm.js"), not at TypeScript source under src/ the way
// cossistant's do — so there's no .ts -> .js/.d.ts extension remapping to
// do here, just stripping the now-redundant "dist/" segment.
//
//   bun run scripts/prepare-package.ts packages/sdk

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";

function stripDistPrefix(value: string): string {
	return `./${value.replace(/^\.\//, "").replace(/^dist\//, "")}`;
}

function toDistExport(value: unknown): unknown {
	if (typeof value === "string") return stripDistPrefix(value);
	if (value && typeof value === "object") {
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toDistExport(v)]));
	}
	return value;
}

/** Converts workspace:* dependencies (e.g. "otto-db": "workspace:*") to real semver versions. */
async function resolveWorkspaceDependencies(
	dependencies: Record<string, string> | undefined,
	packageDir: string,
): Promise<Record<string, string> | undefined> {
	if (!dependencies) return;

	const resolved: Record<string, string> = {};
	for (const [name, version] of Object.entries(dependencies)) {
		if (version === "workspace:*" || version.startsWith("workspace:")) {
			const workspacePkgPath = path.join(packageDir, "..", name, "package.json");
			try {
				const workspacePkg = JSON.parse(await readFile(workspacePkgPath, "utf8"));
				resolved[name] = workspacePkg.version;
			} catch {
				resolved[name] = version; // e.g. otto-typescript-config, a devDependency-only package
			}
		} else {
			resolved[name] = version;
		}
	}
	return resolved;
}

async function main() {
	const packageDir = path.resolve(process.argv[2] ?? ".");
	const pkgPath = path.join(packageDir, "package.json");
	const pkg = JSON.parse(await readFile(pkgPath, "utf8"));

	const distDir = path.join(packageDir, "dist");
	await mkdir(distDir, { recursive: true });

	const distExports = Object.fromEntries(
		Object.entries(pkg.exports ?? {}).map(([key, value]) => [key, toDistExport(value)]),
	);

	const resolvedDependencies = await resolveWorkspaceDependencies(pkg.dependencies, packageDir);
	const resolvedPeerDependencies = await resolveWorkspaceDependencies(pkg.peerDependencies, packageDir);

	// Deliberately doesn't touch `private` — both otto-core and otto-sdk are
	// "private": true today, and that stays as-is here so a `bun publish`
	// still refuses to run until someone consciously removes that flag from
	// the source package.json as part of an actual release.
	const { scripts, devDependencies, files, ...rest } = pkg;
	const distPkg = {
		...rest,
		main: stripDistPrefix(pkg.main),
		...(pkg.module ? { module: stripDistPrefix(pkg.module) } : {}),
		...(pkg.types ? { types: stripDistPrefix(pkg.types) } : {}),
		exports: distExports,
		dependencies: resolvedDependencies,
		peerDependencies: resolvedPeerDependencies,
	};

	const distPkgPath = path.join(distDir, "package.json");
	await writeFile(distPkgPath, `${JSON.stringify(distPkg, null, "\t")}\n`, "utf8");

	for (const fileName of ["README.md", "LICENSE"]) {
		try {
			await copyFile(path.join(packageDir, fileName), path.join(distDir, fileName));
		} catch {
			// optional
		}
	}

	console.log(`[prepare-package] wrote ${path.relative(process.cwd(), distPkgPath)}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
