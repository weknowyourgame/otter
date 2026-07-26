"use client";

import { BookOpen, CreditCard, Sparkles } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageTitle } from "./ui";
import { WorkspaceShell } from "./workspace-shell";

export function DocsPage() {
	return (
		<WorkspaceShell mode="info">
			<div className="od-content-page">
				<PageTitle>Docs</PageTitle>
				<EmptyState
					description="We're still writing these up. In the meantime, Settings → Developers covers API keys, allowed origins, and the widget embed snippet."
					icon={<BookOpen size={28} />}
					title="Documentation is on its way"
					action={
						<Link className="od-inline-link" href="/settings/developers">
							Go to Developers settings
						</Link>
					}
				/>
			</div>
		</WorkspaceShell>
	);
}

export function PricingPage() {
	return (
		<WorkspaceShell mode="info">
			<div className="od-content-page">
				<PageTitle>Pricing</PageTitle>
				<EmptyState
					description="Otter is currently free while we build out the platform. Paid plans aren't live yet — check Settings → Plan & Usage for your current usage."
					icon={<CreditCard size={28} />}
					title="Paid plans aren't live yet"
					action={
						<Link className="od-inline-link" href="/settings/plan">
							View Plan &amp; Usage
						</Link>
					}
				/>
			</div>
		</WorkspaceShell>
	);
}

export function ChangelogPage() {
	return (
		<WorkspaceShell mode="info">
			<div className="od-content-page">
				<PageTitle>Changelog</PageTitle>
				<EmptyState
					description="We haven't started publishing release notes yet. Check back once Otter ships its first public update."
					icon={<Sparkles size={28} />}
					title="Nothing published yet"
				/>
			</div>
		</WorkspaceShell>
	);
}
