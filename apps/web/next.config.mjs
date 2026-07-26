import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	// Anchor tracing to the monorepo root — a stray lockfile in $HOME
	// otherwise makes Next mis-detect the workspace root.
	outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
};

export default nextConfig;
