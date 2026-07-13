import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	// Anchor tracing to the monorepo root — a stray lockfile in $HOME
	// otherwise makes Next mis-detect the workspace root.
	outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
	// Multiple dev servers (or a build during dev) sharing .next corrupt it.
	// Each process can claim its own build dir via NEXT_DIST_DIR.
	distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
