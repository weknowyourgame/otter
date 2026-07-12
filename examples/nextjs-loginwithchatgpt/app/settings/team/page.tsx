import { SettingsShell } from "@/components/settings-shell";

export default function TeamSettingsPage() {
	return (
		<SettingsShell>
			<h1 style={{ fontSize: 32, margin: "0 0 24px" }}>Team</h1>

			<section
				data-ai-section="team"
				style={{ padding: "24px 0", borderTop: "1px solid #222" }}
			>
				<h2 style={{ marginTop: 0 }}>Members</h2>
				<p style={{ color: "#aaa" }}>2 of 5 seats used.</p>
				<button
					type="button"
					data-ai-action="invite-teammate"
					style={{
						marginTop: 8,
						padding: "10px 20px",
						borderRadius: 8,
						border: "1px solid #345",
						background: "#14161c",
						color: "#eee",
						cursor: "pointer",
					}}
				>
					Invite teammate
				</button>
			</section>
		</SettingsShell>
	);
}
