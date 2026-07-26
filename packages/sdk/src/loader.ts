// Tiny script-tag bootstrap. This is the file a customer actually points
// their <script src> at — it stays small and stable so it can be cached
// forever, while the real runtime (otter-widget.global.js, everything in
// this package) is version-pinned and lazy-loaded next to it. Any
// open/close/ask/destroy calls made on window.Otter before the runtime
// finishes loading are queued and replayed once it installs itself.
//
//   <script src="https://cdn.example.com/otter-loader.global.js"
//           data-endpoint="/api/agent" data-public-key="pk_live_..." defer></script>

import type { OtterConfig, OtterInstance } from "./types.js";

type QueuedCall = { method: keyof OtterInstance; args: unknown[] };

type LoaderStub = OtterInstance & {
	__isOtterLoaderStub: true;
	__config: OtterConfig;
	__queue: QueuedCall[];
};

type RuntimeInstance = OtterInstance & { __isOtterRuntime: true };

type LoaderWindow = Window & { Otter?: LoaderStub | RuntimeInstance };

const STUB_METHODS = ["open", "close", "ask", "destroy"] as const;

function configFromDataset(dataset: DOMStringMap): OtterConfig {
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

function createStub(config: OtterConfig): LoaderStub {
	const queue: QueuedCall[] = [];
	const stub = {
		__isOtterLoaderStub: true,
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

(function installOtterLoader() {
	if (typeof window === "undefined" || typeof document === "undefined") return;

	const script = document.currentScript;
	if (!(script instanceof HTMLScriptElement) || !script.src) return;

	const globalWindow = window as LoaderWindow;
	const existing = globalWindow.Otter;
	if (
		existing &&
		("__isOtterRuntime" in existing || "__isOtterLoaderStub" in existing)
	) {
		return; // runtime already installed, or another loader tag already ran
	}

	globalWindow.Otter = createStub(configFromDataset(script.dataset));

	const runtimeScript = document.createElement("script");
	runtimeScript.async = true;
	runtimeScript.src = new URL("otter-widget.global.js", script.src).href;
	document.head.appendChild(runtimeScript);
})();
