// Otter SDK — embeddable AI support agent that completes the task instead
// of explaining it.
//
//   import { init } from "otter-sdk";
//   init({ endpoint: "/api/agent", user: { email: "kim@acme.com" } });

import { AgentLoop } from "./agent.js";
import { Cursor, TargetRing } from "./cursor.js";
import { Executor } from "./executor.js";
import type { OtterConfig, OtterInstance, ResolvedConfig } from "./types.js";
import { WidgetUI } from "./ui.js";

export type {
	AgentAction,
	OtterConfig,
	OtterInstance,
	OtterUser,
	PageSnapshot,
} from "./types.js";

let active: OtterInstance | null = null;

export function init(userConfig: OtterConfig = {}): OtterInstance {
	if (active) {
		console.warn(
			"[otter-sdk] init() called while already active — reusing existing instance.",
		);
		return active;
	}
	if (typeof document === "undefined") {
		throw new Error("[otter-sdk] init() must run in a browser.");
	}

	const config: ResolvedConfig = {
		endpoint: (userConfig.endpoint ?? "/api/agent").replace(/\/$/, ""),
		wsEndpoint: userConfig.wsEndpoint,
		publicKey: userConfig.publicKey?.trim() || undefined,
		name: userConfig.name ?? "Otter",
		accent: userConfig.accent ?? "#69D8C8",
		theme: userConfig.theme ?? "dark",
		position: userConfig.position ?? "bottom-right",
		maxSteps: userConfig.maxSteps ?? 20,
		zIndex: userConfig.zIndex ?? 2147483000,
		riskyWords: userConfig.riskyWords ?? [],
		hideBranding: userConfig.hideBranding ?? false,
		user: userConfig.user ?? {},
	};

	const reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	let loop: AgentLoop;
	const ui = new WidgetUI(config, {
		onSubmit: (text) => void loop.start(text),
		onStop: () => loop.stop(),
	});
	const cursor = new Cursor(ui.shadow, reducedMotion, config.name);
	const ring = new TargetRing(ui.shadow);
	const executor = new Executor(cursor, ring, reducedMotion);
	loop = new AgentLoop(config, ui, executor);

	// Continue a task that navigated across a full page load.
	void loop.resumeIfPending().finally(() => cursor.hide());

	const instance: OtterInstance = {
		open: () => ui.open(),
		close: () => ui.close(),
		ask(message: string) {
			ui.open();
			if (!loop.isRunning) void loop.start(message);
		},
		destroy() {
			loop.stop();
			cursor.destroy();
			ring.destroy();
			ui.destroy();
			active = null;
		},
	};

	active = instance;
	return instance;
}
