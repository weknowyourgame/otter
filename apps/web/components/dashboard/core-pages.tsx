"use client";

import { ArrowRight, Bot, Globe2, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OtterMascot } from "@/components/marks";
import { Button, cx, EmptyState, PageTitle } from "./ui";
import { WorkspaceShell } from "./workspace-shell";

type DashboardSession = {
	id: string;
	title: string;
	state: "active" | "done" | "failed";
	source: "ai" | "local";
	steps: number;
	createdAt: number;
	updatedAt: number;
};

function useSessions(): DashboardSession[] | null {
	const [sessions, setSessions] = useState<DashboardSession[] | null>(null);
	useEffect(() => {
		let active = true;
		fetch("/api/sessions")
			.then((response) => (response.ok ? response.json() : null))
			.then((body: { sessions?: DashboardSession[] } | null) => {
				if (active) setSessions(body?.sessions ?? []);
			})
			.catch(() => {
				if (active) setSessions([]);
			});
		return () => {
			active = false;
		};
	}, []);
	return sessions;
}

function relativeTime(timestamp: number): string {
	const diffMs = Date.now() - timestamp;
	const minutes = Math.round(diffMs / 60_000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}

const inboxFilterMeta = [
	{
		id: "inbox",
		label: "Inbox",
		title: "Welcome to your inbox",
		description: "New conversations will arrive here in real time.",
	},
	{
		id: "resolved",
		label: "Resolved",
		title: "No resolved conversations",
		description: "Closed conversations will stay here for quick review.",
	},
	{
		id: "archived",
		label: "Archived",
		title: "Nothing archived",
		description: "Conversations you archive will stay out of the active queue.",
	},
	{
		id: "spam",
		label: "Spam",
		title: "No spam conversations",
		description: "Filtered or reported conversations will appear here.",
	},
] as const;

export function InboxPage({ filter = "inbox" }: { filter?: string }) {
	const [range, setRange] = useState("7d");
	const [query, setQuery] = useState("");
	const sessions = useSessions();

	const counts = {
		inbox: sessions?.filter((s) => s.state === "active").length ?? 0,
		resolved: sessions?.filter((s) => s.state === "done").length ?? 0,
		archived: 0,
		spam: 0,
	};

	const inboxFilters = inboxFilterMeta.map((item) => ({
		...item,
		count: counts[item.id as keyof typeof counts],
	}));

	const activeFilter =
		inboxFilters.find((item) => item.id === filter.toLowerCase()) ??
		inboxFilters[0];

	const filteredSessions = useMemo(() => {
		if (!sessions) return [];
		if (activeFilter.id === "inbox")
			return sessions.filter((s) => s.state === "active");
		if (activeFilter.id === "resolved")
			return sessions.filter((s) => s.state === "done");
		return [];
	}, [sessions, activeFilter.id]);

	const searchedSessions = useMemo(
		() =>
			filteredSessions.filter((s) =>
				s.title.toLowerCase().includes(query.toLowerCase()),
			),
		[filteredSessions, query],
	);

	const liveCount = counts.inbox;
	const aiHandledPct =
		sessions && sessions.length > 0
			? Math.round(
					(sessions.filter((s) => s.source === "ai").length / sessions.length) *
						100,
				)
			: 0;

	const metrics = [
		["Live visitors", String(liveCount), liveCount > 0 ? "live" : ""],
		["Conversations", String(sessions?.length ?? 0), ""],
		["Handled by AI", `${aiHandledPct}%`, ""],
	] as const;

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
							<strong>
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
					{searchedSessions.length > 0 ? (
						<div className="od-table-wrap od-table-wrap--flush">
							<table className="od-table">
								<thead>
									<tr>
										<th>Conversation</th>
										<th>Handled by</th>
										<th>Steps</th>
										<th>Updated</th>
									</tr>
								</thead>
								<tbody>
									{searchedSessions.map((session) => (
										<tr key={session.id}>
											<td>
												<strong>{session.title}</strong>
											</td>
											<td>
												<span className="od-badge">
													{session.source === "ai" ? "AI" : "Local"}
												</span>
											</td>
											<td>{session.steps}</td>
											<td>{relativeTime(session.updatedAt)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
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
					)}
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
		name: "Otter",
		domain: "otter.so",
		status: "Live",
		conversations: "124",
		agent: "Otter Support",
	},
	{
		name: "Otter Staging",
		domain: "staging.otter.so",
		status: "Test",
		conversations: "18",
		agent: "Staging Agent",
	},
];

function useTenantName(): string | null {
	const [tenantName, setTenantName] = useState<string | null>(null);
	useEffect(() => {
		let active = true;
		fetch("/api/account")
			.then((response) => (response.ok ? response.json() : null))
			.then((body: { tenantName?: string } | null) => {
				if (active && body?.tenantName) setTenantName(body.tenantName);
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);
	return tenantName;
}

export function OrganizationPage() {
	const tenantName = useTenantName();
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
					{tenantName ?? "Loading…"}
				</PageTitle>
				<div className="od-org-summary">
					<div>
						<span>Organization</span>
						<strong>{tenantName ?? "Loading…"}</strong>
					</div>
					<div className="od-org-summary__mark">
						<Users size={22} />
					</div>
				</div>
				<div className="od-list-heading">
					<div>
						<h2>Websites</h2>
						<p>Manage every place your Otter agent is installed.</p>
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
							Add a website source or tune its personality before sharing Otter
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
