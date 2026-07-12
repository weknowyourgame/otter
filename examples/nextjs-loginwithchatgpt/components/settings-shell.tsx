import type { ReactNode } from "react";
import Link from "next/link";

const tabs = [
	{ href: "/settings/security", label: "Security" },
	{ href: "/settings/team", label: "Team" },
	{ href: "/settings/billing", label: "Billing" },
];

export function SettingsShell({ children }: { children: ReactNode }) {
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
				<Link href="/">← Home</Link>
				{tabs.map((tab) => (
					<Link key={tab.href} href={tab.href}>
						{tab.label}
					</Link>
				))}
			</nav>
			{children}
		</main>
	);
}
