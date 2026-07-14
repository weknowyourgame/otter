const services = [
	{
		name: "landing",
		cwd: "apps/landing",
		port: process.env.LANDING_PORT ?? "3000",
		distDir: ".next-main",
		kind: "next",
	},
	{
		name: "web",
		cwd: "apps/web",
		port: process.env.WEB_PORT ?? "3001",
		distDir: ".next-main",
		kind: "next",
	},
	{
		name: "api",
		cwd: "apps/api",
		port: process.env.API_PORT ?? "8787",
		kind: "api",
	},
] as const;

console.log("Starting Otto development servers:\n");
console.log(`  Landing:   http://localhost:${services[0].port}`);
console.log(`  Dashboard: http://localhost:${services[1].port}/dashboard\n`);
console.log(`  API:       http://localhost:${services[2].port}\n`);

const children = services.map((service) =>
	Bun.spawn(
		service.kind === "next"
			? ["bun", "run", "--cwd", service.cwd, "dev", "--", "-p", service.port]
			: ["bun", "run", "--cwd", service.cwd, "dev"],
		{
			env: {
				...process.env,
				PORT: service.port,
				...(service.kind === "next" ? { NEXT_DIST_DIR: service.distDir } : {}),
			},
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		},
	),
);

let stopping = false;

function stop(exitCode: number) {
	if (stopping) return;
	stopping = true;
	for (const child of children) {
		child.kill();
	}
	process.exitCode = exitCode;
}

process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));

const firstExit = await Promise.race(
	children.map(async (child, index) => ({
		index,
		code: await child.exited,
	})),
);

if (!stopping) {
	const service = services[firstExit.index];
	console.error(`\n${service.name} server exited with code ${firstExit.code}.`);
	stop(firstExit.code);
}
