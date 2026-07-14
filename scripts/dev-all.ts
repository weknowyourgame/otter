const services = [
	{
		name: "landing",
		cwd: "apps/landing",
		port: process.env.LANDING_PORT ?? "3000",
		distDir: ".next-main",
	},
	{
		name: "web",
		cwd: "apps/web",
		port: process.env.WEB_PORT ?? "3001",
		distDir: ".next-main",
	},
] as const;

console.log("Starting Otto development servers:\n");
console.log(`  Landing:   http://localhost:${services[0].port}`);
console.log(`  Dashboard: http://localhost:${services[1].port}/dashboard\n`);

const children = services.map((service) =>
	Bun.spawn(
		["bun", "run", "--cwd", service.cwd, "dev", "--", "-p", service.port],
		{
			env: {
				...process.env,
				NEXT_DIST_DIR: service.distDir,
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
