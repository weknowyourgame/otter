import { lstat, mkdir, readlink, rm, symlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

function fail(message: string): never {
	console.error(message);
	process.exit(1);
}

const [appPathArg, targetDirArg] = Bun.argv.slice(2);

if (!appPathArg || !targetDirArg) {
	fail("Usage: bun run scripts/use-next-dist.ts <app-dir> <.next-target>");
}

if (!targetDirArg.startsWith(".next")) {
	fail("The target directory must start with .next");
}

const appDir = path.resolve(repoRoot, appPathArg);
const linkPath = path.join(appDir, ".next");
const targetPath = path.join(appDir, targetDirArg);

if (!appDir.startsWith(`${repoRoot}${path.sep}`)) {
	fail("The app directory must be inside this repository");
}

await mkdir(targetPath, { recursive: true });

let existingLinkTarget: string | undefined;
try {
	const existing = await lstat(linkPath);
	if (existing.isSymbolicLink()) {
		existingLinkTarget = await readlink(linkPath);
	} else {
		await rm(linkPath, { recursive: true, force: true });
	}
} catch (error) {
	if (
		!(error instanceof Error) ||
		!("code" in error) ||
		error.code !== "ENOENT"
	) {
		throw error;
	}
}

if (existingLinkTarget !== undefined) {
	const resolvedExistingTarget = path.resolve(appDir, existingLinkTarget);
	if (resolvedExistingTarget !== targetPath) {
		await rm(linkPath, { force: true });
	} else {
		console.log(
			`Using ${path.relative(repoRoot, targetPath)} via ${path.relative(repoRoot, linkPath)}`,
		);
		process.exit(0);
	}
}

await symlink(targetDirArg, linkPath, "dir");

console.log(
	`Using ${path.relative(repoRoot, targetPath)} via ${path.relative(repoRoot, linkPath)}`,
);
