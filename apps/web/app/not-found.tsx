import Link from "next/link";
import { OtterGlyph } from "@/components/marks";

export default function NotFound() {
	return (
		<main className="od-auth-page">
			<section className="od-auth-panel">
				<header className="od-auth-brand">
					<span>
						<OtterGlyph className="h-5 w-5" />
					</span>
					<div>
						<strong>Otter</strong>
						<small>Agent workspace</small>
					</div>
				</header>
				<div className="od-auth-copy">
					<p>404</p>
					<h1>This page doesn&apos;t exist.</h1>
				</div>
				<p>The link you followed may be broken, or the page may have moved.</p>
				<Link
					className="od-button od-button--primary od-button--md"
					href="/dashboard"
				>
					Back to dashboard
				</Link>
			</section>
		</main>
	);
}
