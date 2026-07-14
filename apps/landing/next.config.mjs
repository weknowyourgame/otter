import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	// Anchor tracing to the monorepo root — a stray lockfile in $HOME
	// otherwise makes Next mis-detect the workspace root.
	outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
	// Lets multiple dev servers/builds coexist without corrupting a shared
	// .next dir — each process can claim its own via NEXT_DIST_DIR.
	distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
