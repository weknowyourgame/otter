import Link from "next/link";
import type { ReactNode } from "react";
import { OtterWordmark } from "./logo";
import { SupportWidget } from "./support-widget";

export function MarketingShell({ children }: { children: ReactNode }) {
	return (
		<div className="mk-page">
			<header className="mk-topbar">
				<div className="mk-shell mk-topbar-inner">
					<Link aria-label="Otter home" href="/"><OtterWordmark /></Link>
					<nav className="mk-desktop-nav" aria-label="Primary navigation">
						<Link href="/docs">Docs</Link>
						<Link href="/price">Pricing</Link>
						<Link href="/changelog">Changelog</Link>
					</nav>
					<Link className="mk-topbar-cta" href="/demo">Open demo</Link>
					<details className="mk-mobile-nav">
						<summary aria-label="Open navigation">☰</summary>
						<div>
							<Link href="/docs">Docs</Link>
							<Link href="/price">Pricing</Link>
							<Link href="/changelog">Changelog</Link>
							<Link href="/demo">Open demo</Link>
						</div>
					</details>
				</div>
			</header>
			<main className="mk-shell mk-main">{children}</main>
			<footer className="mk-footer">
				<div className="mk-shell mk-footer-grid">
					<div>
						<OtterWordmark />
						<p>AI-native support infrastructure that lives inside your product.</p>
					</div>
					<div><strong>Product</strong><Link href="/price">Pricing</Link><Link href="/changelog">Changelog</Link></div>
					<div><strong>Resources</strong><Link href="/docs">Docs</Link><Link href="/demo">Demo</Link></div>
				</div>
				<div className="mk-shell mk-footer-bottom">© 2026 Otter. Built for product teams.</div>
			</footer>
			<SupportWidget />
		</div>
	);
}
