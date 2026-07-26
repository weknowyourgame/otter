const services = [
	{
		name: "landing",
		cwd: "apps/landing",
		port: process.env.LANDING_PORT ?? "3000",
		distDir: ".next-dev",
		kind: "next",
	},
	{
		name: "web",
		cwd: "apps/web",
		port: process.env.WEB_PORT ?? "3001",
		distDir: ".next-dev",
		kind: "next",
	},
	{
		name: "api",
		cwd: "apps/api",
		port: process.env.API_PORT ?? "8787",
		kind: "api",
	},
	{
		name: "workers",
		cwd: "apps/workers",
		port: "",
		kind: "worker",
	},
] as const;

for (const service of services) {
	if (service.kind !== "next") continue;

	const setup = Bun.spawnSync([
		"bun",
		"run",
		"scripts/use-next-dist.ts",
		service.cwd,
		service.distDir,
	]);

	if (!setup.success) {
		console.error(new TextDecoder().decode(setup.stderr));
		process.exit(setup.exitCode);
	}
}

console.log("Starting Otter development servers:\n");
console.log(`  Landing:   http://localhost:${services[0].port}`);
console.log(`  Dashboard: http://localhost:${services[1].port}/dashboard\n`);
console.log(`  API:       http://localhost:${services[2].port}\n`);
console.log("  Workers:   background job processor\n");

const children = services.map((service) =>
	Bun.spawn(
		service.kind === "next"
			? ["bun", "run", "--cwd", service.cwd, "dev", "--", "-p", service.port]
			: ["bun", "run", "--cwd", service.cwd, "dev"],
		{
			env: {
				...process.env,
				PORT: service.port,
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
