import { useEffect } from "react";
import { init } from "ai-widget-sdk";

// Programmatic integration via the ai-widget-sdk workspace package, instead
// of a copy-pasted <script> tag — see packages/sdk/README.md. proxyUrl
// defaults to the relative "/api/ai-proxy", which resolves to this app's own
// Vercel function (api/ai-proxy.ts) / vite dev middleware (vite.config.ts).
const AIWidgetMount = () => {
	useEffect(() => {
		if (window.matchMedia("(max-width: 767px)").matches) return;

		const widget = init({
			title: "Ask about product guidance",
			greeting:
				"Ask me things like \"where is 2FA\" or \"how do I connect Zendesk\" — I'll ask before touching anything.",
			bubbleIcon: "AI",
		});
		return () => widget.destroy();
	}, []);

	return null;
};

export default AIWidgetMount;
