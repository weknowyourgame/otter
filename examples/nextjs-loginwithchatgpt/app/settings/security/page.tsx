"use client";

import { useState } from "react";
import { SettingsShell } from "@/components/settings-shell";

export default function SecuritySettingsPage() {
	const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

	return (
		<SettingsShell>
			<h1 style={{ fontSize: 32, margin: "0 0 24px" }}>Security</h1>

			<section
				data-ai-section="security"
				style={{ padding: "24px 0", borderTop: "1px solid #222" }}
			>
				<h2 style={{ marginTop: 0 }}>Two-factor authentication</h2>
				<p style={{ color: "#aaa", maxWidth: 480 }}>
					Add a second verification step at sign-in using an authenticator app. Recommended for
					all accounts.
				</p>
				<button
					type="button"
					data-ai-action="enable-2fa"
					onClick={() => setTwoFactorEnabled((v) => !v)}
					style={{
						marginTop: 8,
						padding: "10px 20px",
						borderRadius: 8,
						border: "1px solid #2a4",
						background: twoFactorEnabled ? "#12351f" : "#14161c",
						color: twoFactorEnabled ? "#7f7" : "#eee",
						cursor: "pointer",
					}}
				>
					{twoFactorEnabled ? "Two-factor authentication: ON" : "Enable two-factor authentication"}
				</button>
			</section>

			<section style={{ padding: "24px 0", borderTop: "1px solid #222" }}>
				<h2 style={{ marginTop: 0 }}>Active sessions</h2>
				<p style={{ color: "#aaa" }}>You are signed in on 2 devices.</p>
			</section>
		</SettingsShell>
	);
}
