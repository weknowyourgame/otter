"use client";

import { useEffect } from "react";
import { init } from "ai-widget-sdk";

/**
 * Programmatic integration — the pattern a Next.js/React app should use
 * instead of a raw <script> tag: import the SDK, mount it in an effect,
 * and destroy it on unmount so it doesn't leak across route changes.
 *
 * The proxy URL points at packages/server (npm run server from the repo
 * root) — swap it for your own backend that implements the same
 * { message, elements } -> { ok, targetId, action, reply } contract.
 */
export function AIWidgetMount() {
	useEffect(() => {
		const widget = init({
			proxyUrl: "http://localhost:8787/api/ai-proxy",
			// Support-tool handoffs (?guide_handoff=TOKEN) are exchanged for
			// guidance plans at this backend.
			guidanceBaseUrl: "http://localhost:8787",
			title: "Ask about this site",
			greeting:
				"Ask me things like \"take me to getting started\" or \"how does auth work\" — I'll ask before touching anything.",
		});
		return () => widget.destroy();
	}, []);

	return null;
}
