// Tiny script-tag bootstrap. This is the file a customer actually points
// their <script src> at — it stays small and stable so it can be cached
// forever, while the real runtime (otto-widget.global.js, everything in
// this package) is version-pinned and lazy-loaded next to it. Any
// open/close/ask/destroy calls made on window.Otto before the runtime
// finishes loading are queued and replayed once it installs itself.
//
//   <script src="https://cdn.example.com/otto-loader.global.js"
//           data-endpoint="/api/agent" data-public-key="pk_live_..." defer></script>

import type { OttoConfig, OttoInstance } from "./types.js";

type QueuedCall = { method: keyof OttoInstance; args: unknown[] };

type LoaderStub = OttoInstance & {
	__isOttoLoaderStub: true;
	__config: OttoConfig;
	__queue: QueuedCall[];
};

type RuntimeInstance = OttoInstance & { __isOttoRuntime: true };

type LoaderWindow = Window & { Otto?: LoaderStub | RuntimeInstance };

const STUB_METHODS = ["open", "close", "ask", "destroy"] as const;

function configFromDataset(dataset: DOMStringMap): OttoConfig {
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

function createStub(config: OttoConfig): LoaderStub {
	const queue: QueuedCall[] = [];
	const stub = {
		__isOttoLoaderStub: true,
		__config: config,
		__queue: queue,
	} as LoaderStub;
	for (const method of STUB_METHODS) {
		stub[method] = ((...args: unknown[]) => {
			queue.push({ method, args });
		}) as never;
	}
	return stub;
}

(function installOttoLoader() {
	if (typeof window === "undefined" || typeof document === "undefined") return;

	const script = document.currentScript;
	if (!(script instanceof HTMLScriptElement) || !script.src) return;

	const globalWindow = window as LoaderWindow;
	const existing = globalWindow.Otto;
	if (
		existing &&
		("__isOttoRuntime" in existing || "__isOttoLoaderStub" in existing)
	) {
		return; // runtime already installed, or another loader tag already ran
	}

	globalWindow.Otto = createStub(configFromDataset(script.dataset));

	const runtimeScript = document.createElement("script");
	runtimeScript.async = true;
	runtimeScript.src = new URL("otto-widget.global.js", script.src).href;
	document.head.appendChild(runtimeScript);
})();
