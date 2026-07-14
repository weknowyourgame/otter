"use client";

import { init } from "otto-sdk";
import { useEffect } from "react";

// Mounts the Otto widget on the demo app. StrictMode double-mount is safe:
// init() reuses the active instance; destroy on real unmount.
export function OttoMount() {
	useEffect(() => {
		const otto = init({
			endpoint: "/api/agent",
			publicKey: process.env.NEXT_PUBLIC_OTTO_PUBLIC_KEY,
			name: "Otto",
			accent: "#5B6CF9",
			theme: "dark",
			user: { email: "demo@cordant.io", name: "Demo User" },
		});
		return () => otto.destroy();
	}, []);
	return null;
}
