import { SettingsShell } from "@/components/settings-shell";

// Billing is registered as risk: "high" in the backend intent registry, and
// the section text below trips the SDK's risky-word list too — so a handoff
// here is always highlight-only, never a click, by two independent layers.
export default function BillingSettingsPage() {
	return (
		<SettingsShell>
			<h1 style={{ fontSize: 32, margin: "0 0 24px" }}>Billing</h1>

			<section
				data-ai-section="billing"
				style={{ padding: "24px 0", borderTop: "1px solid #222" }}
			>
				<h2 style={{ marginTop: 0 }}>Subscription</h2>
				<p style={{ color: "#aaa" }}>Pro plan · $29/month · renews Aug 1.</p>
				<button
					type="button"
					style={{
						marginTop: 8,
						padding: "10px 20px",
						borderRadius: 8,
						border: "1px solid #533",
						background: "#1c1414",
						color: "#faa",
						cursor: "pointer",
					}}
				>
					Change payment method
				</button>
			</section>
		</SettingsShell>
	);
}
