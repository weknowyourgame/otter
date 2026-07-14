// The real runtime — everything the loader lazy-loads. Picks up the config
// and any queued calls the loader stub collected, calls the real init(),
// then replaces window.Otto with the live instance and replays the queue.

import { init } from "./index.js";
import type { OttoConfig, OttoInstance } from "./types.js";

type QueuedCall = { method: keyof OttoInstance; args: unknown[] };

type LoaderStub = Partial<OttoInstance> & {
	__isOttoLoaderStub?: true;
	__config?: OttoConfig;
	__queue?: QueuedCall[];
};

type RuntimeInstance = OttoInstance & { __isOttoRuntime: true };

type RuntimeWindow = Window & { Otto?: LoaderStub | RuntimeInstance };

function configFromDataset(dataset: DOMStringMap | undefined): OttoConfig {
	if (!dataset) return {};
	return {
		endpoint: dataset.endpoint || undefined,
		wsEndpoint: dataset.wsEndpoint || undefined,
		publicKey: dataset.publicKey || undefined,
		name: dataset.name || undefined,
		accent: dataset.accent || undefined,
		theme: (dataset.theme as OttoConfig["theme"]) || undefined,
		position: (dataset.position as OttoConfig["position"]) || undefined,
	};
}

(function installOttoRuntime() {
	if (typeof window === "undefined" || typeof document === "undefined") return;

	const globalWindow = window as RuntimeWindow;
	const existing = globalWindow.Otto;
	if (existing && "__isOttoRuntime" in existing) return; // already installed

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
	instance.__isOttoRuntime = true;

	for (const call of existing?.__queue ?? []) {
		const method = instance[call.method];
		if (typeof method === "function") {
			(method as (...args: unknown[]) => unknown).apply(instance, call.args);
		}
	}

	globalWindow.Otto = instance;
})();
