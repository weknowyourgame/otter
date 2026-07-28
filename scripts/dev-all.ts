async function readEnvFile(path: string): Promise<Record<string, string>> {
	const file = Bun.file(path);
	if (!(await file.exists())) return {};

	const env: Record<string, string> = {};
	for (const rawLine of (await file.text()).split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const separatorIndex = line.indexOf("=");
		if (separatorIndex === -1) continue;

		const key = line.slice(0, separatorIndex).trim();
		let value = line.slice(separatorIndex + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		env[key] = value;
	}
	return env;
}

const apiEnv = await readEnvFile("apps/api/.env");
const webCrawlBackend =
	process.env.WEB_CRAWL_BACKEND ?? apiEnv.WEB_CRAWL_BACKEND;
const useCloudflareWorker = webCrawlBackend === "cloudflare";

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
		port: useCloudflareWorker ? "8790" : "",
		kind: useCloudflareWorker ? "worker-cloudflare" : "worker",
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
console.log(
	useCloudflareWorker
		? `  Workers:   Cloudflare Queue local dev server http://localhost:${services[3].port}\n`
		: "  Workers:   BullMQ background job processor\n",
);

function commandFor(service: (typeof services)[number]): string[] {
	if (service.kind === "next") {
		return [
			"bun",
			"run",
			"--cwd",
			service.cwd,
			"dev",
			"--",
			"-p",
			service.port,
		];
	}
	if (service.kind === "worker-cloudflare") {
		return ["bun", "run", "--cwd", service.cwd, "dev:cloudflare"];
	}
	return ["bun", "run", "--cwd", service.cwd, "dev"];
}

const children = services.map((service) =>
	Bun.spawn(commandFor(service), {
		env: {
			...process.env,
			PORT: service.port,
		},
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	}),
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
