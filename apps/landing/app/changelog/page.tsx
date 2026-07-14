import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
	title: "Changelog - Otto",
	description: "Product updates and improvements from the Otto team.",
};

const entries = [
	{
		version: "0.3.0",
		date: "July 14, 2026",
		title: "Action-ready support sessions",
		description: "Otto can now explain, request approval, act in the interface, and confirm the result in one visible session.",
		items: ["Persistent stop control during tasks", "Clear action trail inside chat", "Safer approval gates for sensitive actions"],
	},
	{
		version: "0.2.0",
		date: "June 28, 2026",
		title: "Native embed and theme inheritance",
		description: "A lighter install path and automatic theme matching make Otto feel native from the first render.",
		items: ["Single-command Next.js install", "Automatic color and radius inheritance", "Smaller widget runtime"],
	},
	{
		version: "0.1.0",
		date: "June 02, 2026",
		title: "The first public preview",
		description: "The first usable release of Otto support for product teams.",
		items: ["AI and human handoff", "Knowledge-backed answers", "Live dashboard sessions"],
	},
];

export default function ChangelogPage() {
	return (
		<MarketingShell>
			<section className="mk-changelog-hero">
				<p className="mk-kicker">[Product updates]</p>
				<h1>Changelog</h1>
				<p>New capabilities, thoughtful refinements, and the occasional sharp edge removed.</p>
			</section>
			<section className="mk-changelog-list">
				{entries.map((entry) => (
					<article key={entry.version}>
						<aside><strong>v{entry.version}</strong><time>{entry.date}</time></aside>
						<div>
							<h2>{entry.title}</h2>
							<p>{entry.description}</p>
							<ul>{entry.items.map((item) => <li key={item}><span>+</span>{item}</li>)}</ul>
						</div>
					</article>
				))}
			</section>
		</MarketingShell>
	);
}
