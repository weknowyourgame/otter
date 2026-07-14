// Script-tag build: exposes window.Otto and auto-inits from data attributes.
//
//   <script src="https://cdn.example.com/otto.js"
//           data-endpoint="/api/agent" data-accent="#5B6CF9" defer></script>

import { init } from "./index.js";
import type { OttoConfig } from "./types.js";

export { init };

const script = document.currentScript;
if (script instanceof HTMLScriptElement && script.dataset.endpoint !== undefined) {
	const config: OttoConfig = {
		endpoint: script.dataset.endpoint || undefined,
		wsEndpoint: script.dataset.wsEndpoint || undefined,
		name: script.dataset.name || undefined,
		accent: script.dataset.accent || undefined,
		theme: (script.dataset.theme as OttoConfig["theme"]) || undefined,
		position: (script.dataset.position as OttoConfig["position"]) || undefined,
	};
	const boot = () => void init(config);
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", boot, { once: true });
	} else {
		boot();
	}
}
