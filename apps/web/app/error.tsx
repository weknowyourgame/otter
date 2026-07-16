"use client";

import { useEffect } from "react";
import { Button } from "@/components/dashboard/ui";
import { OttoGlyph } from "@/components/marks";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<main className="od-auth-page">
			<section className="od-auth-panel">
				<header className="od-auth-brand">
					<span>
						<OttoGlyph className="h-5 w-5" />
					</span>
					<div>
						<strong>Otto</strong>
						<small>Agent workspace</small>
					</div>
				</header>
				<div className="od-auth-copy">
					<p>Something went wrong</p>
					<h1>An unexpected error occurred.</h1>
				</div>
				<p>Try again, or head back to the dashboard.</p>
				<Button onClick={reset} variant="primary">
					Try again
				</Button>
			</section>
		</main>
	);
}
