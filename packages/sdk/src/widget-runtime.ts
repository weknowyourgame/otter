// The real runtime — everything the loader lazy-loads. Picks up the config
// and any queued calls the loader stub collected, calls the real init(),
// then replaces window.Otter with the live instance and replays the queue.

import { init } from "./index.js";
import type { OtterConfig, OtterInstance } from "./types.js";

type QueuedCall = { method: keyof OtterInstance; args: unknown[] };

type LoaderStub = Partial<OtterInstance> & {
	__isOtterLoaderStub?: true;
	__config?: OtterConfig;
	__queue?: QueuedCall[];
};

type RuntimeInstance = OtterInstance & { __isOtterRuntime: true };

type RuntimeWindow = Window & { Otter?: LoaderStub | RuntimeInstance };

function configFromDataset(dataset: DOMStringMap | undefined): OtterConfig {
	if (!dataset) return {};
	return {
		endpoint: dataset.endpoint || undefined,
		wsEndpoint: dataset.wsEndpoint || undefined,
		publicKey: dataset.publicKey || undefined,
		name: dataset.name || undefined,
		accent: dataset.accent || undefined,
		theme: (dataset.theme as OtterConfig["theme"]) || undefined,
		position: (dataset.position as OtterConfig["position"]) || undefined,
	};
}

(function installOtterRuntime() {
	if (typeof window === "undefined" || typeof document === "undefined") return;

	const globalWindow = window as RuntimeWindow;
	const existing = globalWindow.Otter;
	if (existing && "__isOtterRuntime" in existing) return; // already installed

	// Loaded via the loader stub (normal path), or the widget script was
	// dropped in directly without the loader — fall back to reading this
	// script's own data-* attributes in that case.
	const script = document.currentScript;
	const config =
		existing?.__config ??
		configFromDataset(
			script instanceof HTMLScriptElement ? script.dataset : undefined,
		);

	const instance = init(config) as RuntimeInstance;
	instance.__isOtterRuntime = true;

	for (const call of existing?.__queue ?? []) {
		const method = instance[call.method];
		if (typeof method === "function") {
			(method as (...args: unknown[]) => unknown).apply(instance, call.args);
		}
	}

	globalWindow.Otter = instance;
})();
