"use client";

import { init } from "otter-sdk";
import { useEffect } from "react";

// Mounts the Otter widget on the demo app. StrictMode double-mount is safe:
// init() reuses the active instance; destroy on real unmount.
export function OtterMount() {
	useEffect(() => {
		let publicKey = process.env.NEXT_PUBLIC_OTTER_PUBLIC_KEY;
		try {
			publicKey =
				window.localStorage.getItem("otter-demo-public-key")?.trim() ||
				publicKey;
		} catch {
			// localStorage can be unavailable in restricted browser modes.
		}
		const otter = init({
			endpoint: "/api/agent",
			publicKey,
			name: "Otter",
			accent: "#5B6CF9",
			theme: "dark",
			user: { email: "demo@cordant.io", name: "Demo User" },
		});
		return () => otter.destroy();
	}, []);
	return null;
}
