const steps = [
	{ n: "01", title: "User clicks the button", body: "They sign in with their own ChatGPT account." },
	{ n: "02", title: "Token stored, encrypted", body: "Saved with AES-256-GCM, keyed from the OS keychain." },
	{ n: "03", title: "AI runs on their plan", body: "Every call bills the user's subscription, not yours." },
];

export default function HomePage() {
	return (
		<main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
			<nav
				style={{
					display: "flex",
					gap: 24,
					padding: "20px 0",
					borderBottom: "1px solid #222",
					marginBottom: 32,
					fontSize: 14,
				}}
			>
				<a href="#getting-started">Getting Started</a>
				<a href="#how-it-works">How it Works</a>
				<a href="#docs">Docs</a>
				<a href="https://github.com/weknowyourgame/loginwithchatgpt" target="_blank" rel="noopener noreferrer">
					GitHub
				</a>
			</nav>

			<section style={{ padding: "48px 0" }}>
				<p style={{ textTransform: "uppercase", letterSpacing: 2, fontSize: 12, color: "#888" }}>
					open source · example app
				</p>
				<h1 style={{ fontSize: 48, lineHeight: 1.1, margin: "12px 0" }}>Login with ChatGPT</h1>
				<p style={{ color: "#aaa", maxWidth: 480 }}>
					A drop-in button that lets your users power your app&apos;s AI with their own ChatGPT
					subscription — no API key, no usage bill.
				</p>
			</section>

			<section id="getting-started" style={{ padding: "32px 0", borderTop: "1px solid #222" }}>
				<h2>Getting Started</h2>
				<pre
					style={{
						background: "#141416",
						padding: 16,
						borderRadius: 8,
						overflowX: "auto",
						fontSize: 13,
					}}
				>
					npm install loginwithchatgpt
				</pre>
			</section>

			<section id="how-it-works" style={{ padding: "32px 0", borderTop: "1px solid #222" }}>
				<h2>How it Works</h2>
				<div style={{ display: "grid", gap: 16 }}>
					{steps.map((s) => (
						<div key={s.n}>
							<p style={{ color: "#666", fontSize: 12, margin: 0 }}>{s.n}</p>
							<h3 style={{ margin: "4px 0" }}>{s.title}</h3>
							<p style={{ color: "#aaa", margin: 0 }}>{s.body}</p>
						</div>
					))}
				</div>
			</section>

			<section id="docs" style={{ padding: "32px 0", borderTop: "1px solid #222" }}>
				<h2>Docs</h2>
				<p style={{ color: "#aaa" }}>
					Full API reference, OAuth flow details, and framework guides.
				</p>
				<a
					href="#docs"
					data-ai-action="open-docs"
					style={{
						display: "inline-block",
						marginTop: 8,
						padding: "8px 16px",
						border: "1px solid #333",
						borderRadius: 8,
					}}
				>
					Read the docs
				</a>
			</section>

			<section style={{ padding: "32px 0", borderTop: "1px solid #222" }}>
				<h2>Account</h2>
				<p style={{ color: "#aaa" }}>
					For testing the widget&apos;s safety boundary — this button should only ever be{" "}
					<em>highlighted</em>, never auto-clicked, no matter how it&apos;s asked for.
				</p>
				<button
					type="button"
					style={{
						marginTop: 8,
						padding: "8px 16px",
						border: "1px solid #522",
						borderRadius: 8,
						background: "#2a1414",
						color: "#f88",
					}}
				>
					Delete Account
				</button>
			</section>
		</main>
	);
}
