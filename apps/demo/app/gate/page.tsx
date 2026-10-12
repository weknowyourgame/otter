export const metadata = {
	title: "Otter demo",
	robots: { index: false, follow: false },
};

export default async function GatePage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string; next?: string }>;
}) {
	const { error, next } = await searchParams;
	return (
		<main
			style={{
				minHeight: "100vh",
				display: "grid",
				placeItems: "center",
				background: "#0b0d10",
				color: "#e8eaed",
				fontFamily: "system-ui, -apple-system, sans-serif",
				padding: 16,
			}}
		>
			<form
				method="post"
				action="/api/gate"
				style={{
					width: "100%",
					maxWidth: 360,
					display: "grid",
					gap: 14,
					padding: 28,
					border: "1px solid #23272e",
					borderRadius: 14,
					background: "#12151a",
				}}
			>
				<div style={{ fontSize: 20, fontWeight: 600 }}>Otter demo</div>
				<div style={{ fontSize: 14, color: "#9aa0a6" }}>
					Enter the access password from the resume to continue.
				</div>
				<input type="hidden" name="next" value={next ?? "/demo"} />
				<input
					name="password"
					type="password"
					placeholder="Password"
					autoFocus
					required
					autoComplete="current-password"
					style={{
						padding: "11px 12px",
						borderRadius: 9,
						border: "1px solid #2f343c",
						background: "#0b0d10",
						color: "inherit",
						fontSize: 15,
					}}
				/>
				{error ? (
					<div style={{ fontSize: 13, color: "#ff7b72" }}>Wrong password.</div>
				) : null}
				<button
					type="submit"
					style={{
						padding: "11px 12px",
						borderRadius: 9,
						border: "none",
						background: "#69d8c8",
						color: "#06201c",
						fontWeight: 600,
						fontSize: 15,
						cursor: "pointer",
					}}
				>
					Enter demo
				</button>
			</form>
		</main>
	);
}
