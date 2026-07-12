import { init } from "./widget.js";
import type { WidgetConfig, WidgetInstance } from "./types.js";

export { init };
export type { WidgetConfig, WidgetInstance };

export const VERSION = "0.1.0";

// Auto-init for classic <script src="ai-widget-sdk.global.js" data-ai-proxy-url="...">
// usage. document.currentScript is only ever non-null for a directly-loaded
// classic script during its own synchronous execution — it's always null
// when this module is imported into a bundler (Vite/webpack/etc.), so
// programmatic `import { init } from "ai-widget-sdk"` consumers never get
// an unwanted auto-injected widget. Set data-auto-init="false" to opt out
// of a classic <script> tag auto-initing and call init() yourself instead.
(function autoInit() {
	if (typeof document === "undefined") return;
	const script = document.currentScript as HTMLScriptElement | null;
	if (!script) return;
	if (script.dataset.autoInit === "false") return;

	const config: WidgetConfig = {};
	if (script.dataset.aiProxyUrl) config.proxyUrl = script.dataset.aiProxyUrl;
	if (script.dataset.aiAuthHeader) config.authHeader = script.dataset.aiAuthHeader;
	if (script.dataset.aiAuthToken) config.authToken = script.dataset.aiAuthToken;
	if (script.dataset.aiPosition === "bottom-left" || script.dataset.aiPosition === "bottom-right") {
		config.position = script.dataset.aiPosition;
	}
	if (script.dataset.aiAccentColor) config.accentColor = script.dataset.aiAccentColor;
	if (script.dataset.aiBubbleIcon) config.bubbleIcon = script.dataset.aiBubbleIcon;
	if (script.dataset.aiTitle) config.title = script.dataset.aiTitle;
	if (script.dataset.aiGreeting) config.greeting = script.dataset.aiGreeting;
	if (script.dataset.aiPlaceholder) config.placeholder = script.dataset.aiPlaceholder;

	const run = () => init(config);
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", run, { once: true });
	} else {
		run();
	}
})();
