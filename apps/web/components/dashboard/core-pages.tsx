"use client";

import { ArrowRight, Bot, Globe2, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { OtterMascot } from "@/components/marks";
import { Button, cx, EmptyState, PageTitle } from "./ui";
import { WorkspaceShell } from "./workspace-shell";

const metrics = [
	["Live visitors", "3", "live"],
	["Median response time", "18s", ""],
	["Median time to resolution", "2m 41s", ""],
	["Handled by AI", "84%", ""],
	["Satisfaction index", "96 /100", "positive"],
	["Unique visitors", "184", ""],
] as const;

const inboxFilters = [
	{
		id: "inbox",
		label: "Inbox",
		count: 0,
		title: "Welcome to your inbox",
		description: "New conversations will arrive here in real time.",
	},
	{
		id: "resolved",
		label: "Resolved",
		count: 0,
		title: "No resolved conversations",
		description: "Closed conversations will stay here for quick review.",
	},
	{
		id: "archived",
		label: "Archived",
		count: 0,
		title: "Nothing archived",
		description: "Conversations you archive will stay out of the active queue.",
	},
	{
		id: "spam",
		label: "Spam",
		count: 0,
		title: "No spam conversations",
		description: "Filtered or reported conversations will appear here.",
	},
] as const;

export function InboxPage({ filter = "inbox" }: { filter?: string }) {
	const [range, setRange] = useState("7d");
	const [query, setQuery] = useState("");
	const activeFilter =
		inboxFilters.find((item) => item.id === filter.toLowerCase()) ??
		inboxFilters[0];

	return (
		<WorkspaceShell mode="inbox">
			<div className="od-inbox-page">
				<div className="od-inbox-head">
					<PageTitle>Inbox</PageTitle>
					<fieldset className="od-range-control" aria-label="Date range">
						<Globe2 size={15} />
						{["7d", "14d", "30d"].map((item) => (
							<button
								className={range === item ? "is-active" : ""}
								key={item}
								onClick={() => setRange(item)}
								type="button"
							>
								{item}
							</button>
						))}
					</fieldset>
				</div>
				<div className="od-metrics-grid">
					{metrics.map(([label, value, tone]) => (
						<div className="od-metric" key={label}>
							<span>{label}</span>
							<strong className={cx(tone === "positive" && "is-positive")}>
								{tone === "live" ? <i /> : null}
								{value}
							</strong>
						</div>
					))}
				</div>
				<section className="od-inbox-panel" aria-label="Conversation inbox">
					<div className="od-inbox-tabs" role="tablist">
						{inboxFilters.map((item) => (
							<Link
								aria-selected={activeFilter.id === item.id}
								className={cx(
									"od-inbox-tab",
									activeFilter.id === item.id && "is-active",
								)}
								href={`/dashboard?filter=${item.id}`}
								key={item.id}
								role="tab"
							>
								<span>{item.label}</span>
								<strong>{item.count}</strong>
							</Link>
						))}
					</div>
					<div className="od-inbox-toolbar">
						<Search size={15} />
						<input
							aria-label={`Search ${activeFilter.label.toLowerCase()} conversations`}
							onChange={(event) => setQuery(event.target.value)}
							placeholder={`Search ${activeFilter.label.toLowerCase()} conversations`}
							value={query}
						/>
						<span>{activeFilter.count} conversations</span>
					</div>
					<EmptyState
						action={
							<div className="od-empty-links">
								<Link href="/websites/create">Read setup guide</Link>
								<Link href="/docs">What are visitors?</Link>
								<Link href="/docs">Learn about conversations</Link>
							</div>
						}
						description={activeFilter.description}
						icon={<OtterMascot className="od-otter-mascot" />}
						title={activeFilter.title}
					/>
				</section>
			</div>
		</WorkspaceShell>
	);
}

const contacts = [
	{
		name: "Aarav Mehta",
		email: "aarav@northstar.dev",
		company: "Northstar",
		conversations: 8,
		status: "Online",
	},
	{
		name: "Mina Park",
		email: "mina@rareform.co",
		company: "Rareform",
		conversations: 3,
		status: "Seen 12m ago",
	},
	{
		name: "Theo Martin",
		email: "theo@pixelsmith.io",
		company: "Pixelsmith",
		conversations: 6,
		status: "Seen yesterday",
	},
];

export function ContactsPage() {
	const [query, setQuery] = useState("");
	const filtered = useMemo(
		() =>
			contacts.filter((contact) =>
				`${contact.name} ${contact.email} ${contact.company}`
					.toLowerCase()
					.includes(query.toLowerCase()),
			),
		[query],
	);
	return (
		<WorkspaceShell mode="contacts">
			<div className="od-content-page od-content-page--wide">
				<PageTitle
					action={
						<Button>
							<Plus size={15} /> Add contact
						</Button>
					}
				>
					Contacts
				</PageTitle>
				<div className="od-toolbar">
					<Search size={15} />
					<input
						aria-label="Search contacts"
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search people, companies, or email"
						value={query}
					/>
					<span>{filtered.length} people</span>
				</div>
				<div className="od-table-wrap">
					<table className="od-table">
						<thead>
							<tr>
								<th>Contact</th>
								<th>Company</th>
								<th>Conversations</th>
								<th>Last seen</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{filtered.map((contact) => (
								<tr key={contact.email}>
									<td>
										<div className="od-person">
											<span>{contact.name.slice(0, 1)}</span>
											<div>
												<strong>{contact.name}</strong>
												<small>{contact.email}</small>
											</div>
										</div>
									</td>
									<td>{contact.company}</td>
									<td>{contact.conversations}</td>
									<td>{contact.status}</td>
									<td>
										<Button
											aria-label={`Open ${contact.name}`}
											size="icon"
											variant="ghost"
										>
											<ArrowRight size={15} />
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</WorkspaceShell>
	);
}

const websites = [
	{
		name: "Otto",
		domain: "otto.so",
		status: "Live",
		conversations: "124",
		agent: "Otto Support",
	},
	{
		name: "Otto Staging",
		domain: "staging.otto.so",
		status: "Test",
		conversations: "18",
		agent: "Staging Agent",
	},
];

export function OrganizationPage() {
	return (
		<WorkspaceShell mode="org">
			<div className="od-content-page od-content-page--wide">
				<PageTitle
					action={
						<Link
							className="od-button od-button--primary od-button--md"
							href="/websites/create"
						>
							<Plus size={15} /> New website
						</Link>
					}
				>
					Otto Labs
				</PageTitle>
				<div className="od-org-summary">
					<div>
						<span>Organization</span>
						<strong>Otto Labs</strong>
						<small>2 websites · 3 teammates</small>
					</div>
					<div className="od-org-summary__mark">
						<Users size={22} />
					</div>
				</div>
				<div className="od-list-heading">
					<div>
						<h2>Websites</h2>
						<p>Manage every place your Otto agent is installed.</p>
					</div>
					<Link href="/organizations/create">Create another organization</Link>
				</div>
				<div className="od-website-grid">
					{websites.map((site) => (
						<Link
							className="od-website-row"
							href="/dashboard"
							key={site.domain}
						>
							<div className="od-website-row__icon">
								<Globe2 size={18} />
							</div>
							<div>
								<strong>{site.name}</strong>
								<small>{site.domain}</small>
							</div>
							<span
								className={cx("od-status", site.status === "Live" && "is-live")}
							>
								{site.status}
							</span>
							<div>
								<small>AI agent</small>
								<span>{site.agent}</span>
							</div>
							<div>
								<small>Conversations</small>
								<span>{site.conversations}</span>
							</div>
							<ArrowRight size={16} />
						</Link>
					))}
				</div>
				<div className="od-next-step">
					<Bot size={19} />
					<div>
						<strong>Your support agent is ready for more context.</strong>
						<p>
							Add a website source or tune its personality before sharing Otto
							with customers.
						</p>
					</div>
					<Link href="/agent">
						Open agent <ArrowRight size={14} />
					</Link>
				</div>
			</div>
		</WorkspaceShell>
	);
}
