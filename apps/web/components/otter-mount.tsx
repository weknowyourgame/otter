"use client";

import { init } from "otter-sdk";
import { useEffect } from "react";

const DEFAULT_OTTER_API_URL = "http://localhost:8787";

// Mounts the Otter widget on the demo app. StrictMode double-mount is safe:
// init() reuses the active instance; destroy on real unmount.
export function OtterMount() {
	useEffect(() => {
		let publicKey = process.env.NEXT_PUBLIC_OTTER_PUBLIC_KEY;
		let endpoint =
			process.env.NEXT_PUBLIC_OTTER_API_URL ?? DEFAULT_OTTER_API_URL;
		try {
			publicKey =
				window.localStorage.getItem("otter-demo-public-key")?.trim() ||
				publicKey;
			endpoint =
				window.localStorage.getItem("otter-demo-api-url")?.trim() ||
				endpoint;
		} catch {
			// localStorage can be unavailable in restricted browser modes.
		}
		const otter = init({
			endpoint,
			publicKey,
			name: "Otter",
			accent: "#69D8C8",
			theme: "dark",
			user: { email: "demo@cordant.io", name: "Demo User" },
		});
		return () => otter.destroy();
	}, []);
	return null;
}
