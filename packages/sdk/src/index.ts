import { init } from "./widget.js";
import type { WidgetConfig, WidgetInstance } from "./types.js";

export { init };
export type { WidgetConfig, WidgetInstance };

export const VERSION = "0.1.0";

// Auto-init for classic <script src="ai-widget-sdk.global.js" data-ai-proxy-url="...">
// usage.
//
// document.currentScript is non-null for ANY classic (non-module) script
// tag during its own synchronous execution — including bundler output.
// This is reliably null for genuine ESM (Vite emits <script type="module">,
// which is null by spec), but Next.js/webpack/CRA bundle npm imports into
// classic <script src="/_next/static/chunks/...."> tags too, where it is
// NOT null. Without a second check, `import { init } from "ai-widget-sdk"`
// in a webpack-bundled app would race its own auto-init against your
// explicit init() call — auto-init runs first (at module load), wins the
// activeInstance guard, and your call silently reuses its (wrong, default)
// config instead of creating a new instance.
//
// So: only treat this as a real standalone embed if the script tag
// actually looks like one — either its src matches our own build output,
// or it carries at least one of our data-ai-* config attributes. A bare
// unrelated bundler chunk has neither.
(function autoInit() {
	if (typeof document === "undefined") return;
	const script = document.currentScript as HTMLScriptElement | null;
	if (!script) return;
	const looksLikeOwnEmbed =
		/ai-widget-sdk/i.test(script.src) ||
		Object.keys(script.dataset).some((key) => key.startsWith("ai") || key === "autoInit");
	if (!looksLikeOwnEmbed) return;
	if (script.dataset.autoInit === "false") return;

	const config: WidgetConfig = {};
	if (script.dataset.aiProxyUrl) config.proxyUrl = script.dataset.aiProxyUrl;
	if (script.dataset.aiGuidanceBaseUrl) config.guidanceBaseUrl = script.dataset.aiGuidanceBaseUrl;
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
