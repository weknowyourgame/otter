"use client";

import { ArrowRight, Bot, Globe2, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OtterMascot } from "@/components/marks";
import { withDemoDashboardSessions } from "./demo-fixtures";
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
	events: Array<{
		at: number;
		kind: "user" | "agent" | "step" | "result";
		text: string;
	}>;
};

function useSessions(): DashboardSession[] | null {
	const [sessions, setSessions] = useState<DashboardSession[] | null>(null);
	useEffect(() => {
		let active = true;
		fetch("/api/sessions?limit=500")
			.then((response) => (response.ok ? response.json() : null))
			.then((body: { sessions?: DashboardSession[] } | null) => {
				if (active)
					setSessions(withDemoDashboardSessions(body?.sessions ?? []));
			})
			.catch(() => {
				if (active) setSessions(withDemoDashboardSessions([]));
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

const rangeDays = {
	"7d": 7,
	"14d": 14,
	"30d": 30,
} as const;

type ConversationRange = keyof typeof rangeDays;

function stateLabel(state: DashboardSession["state"]): string {
	if (state === "done") return "Done";
	if (state === "failed") return "Failed";
	return "Active";
}

function eventLabel(kind: DashboardSession["events"][number]["kind"]): string {
	if (kind === "user") return "Visitor";
	if (kind === "agent") return "Agent";
	if (kind === "step") return "Action";
	return "Result";
}

function latestEvent(session: DashboardSession) {
	return session.events.at(-1);
}

export function ConversationsPage() {
	const [range, setRange] = useState<ConversationRange>("7d");
	const [query, setQuery] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const sessions = useSessions();

	const rangeSessions = useMemo(() => {
		if (!sessions) return [];
		const since = Date.now() - rangeDays[range] * 24 * 60 * 60 * 1000;
		return sessions.filter((session) => session.createdAt >= since);
	}, [sessions, range]);

	const searchedSessions = useMemo(
		() =>
			rangeSessions.filter((session) => {
				const haystack = [
					session.title,
					...session.events.map((event) => event.text),
				]
					.join(" ")
					.toLowerCase();
				return haystack.includes(query.toLowerCase());
			}),
		[rangeSessions, query],
	);

	useEffect(() => {
		if (searchedSessions.length === 0) {
			setSelectedId(null);
			return;
		}
		if (
			!selectedId ||
			!searchedSessions.some((session) => session.id === selectedId)
		) {
			setSelectedId(searchedSessions[0]?.id ?? null);
		}
	}, [searchedSessions, selectedId]);

	const activeCount = rangeSessions.filter(
		(session) => session.state === "active",
	).length;
	const totalSteps = rangeSessions.reduce(
		(sum, session) => sum + session.steps,
		0,
	);
	const selectedSession =
		searchedSessions.find((session) => session.id === selectedId) ??
		searchedSessions[0] ??
		null;

	const metrics = [
		["Active sessions", String(activeCount), activeCount > 0 ? "live" : ""],
		["Conversations", String(rangeSessions.length), ""],
		["Agent steps", String(totalSteps), ""],
	] as const;

	return (
		<WorkspaceShell mode="conversations">
			<div className="od-inbox-page">
				<div className="od-inbox-head">
					<PageTitle>Conversations</PageTitle>
					<fieldset className="od-range-control" aria-label="Date range">
						<Globe2 size={15} />
						{(["7d", "14d", "30d"] as const).map((item) => (
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
				<section className="od-inbox-panel" aria-label="Agent conversations">
					<div className="od-inbox-toolbar">
						<Search size={15} />
						<input
							aria-label="Search conversations"
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search conversations or agent activity"
							value={query}
						/>
						<span>{searchedSessions.length} conversations</span>
					</div>
					{searchedSessions.length > 0 ? (
						<div className="od-conversation-browser">
							<div className="od-conversation-list" role="list">
								{searchedSessions.map((session) => {
									const event = latestEvent(session);
									return (
										<button
											className={cx(
												"od-conversation-item",
												selectedSession?.id === session.id && "is-active",
											)}
											key={session.id}
											onClick={() => setSelectedId(session.id)}
											type="button"
										>
											<span className="od-conversation-item__head">
												<strong>{session.title}</strong>
												<span
													className={cx("od-state-pill", `is-${session.state}`)}
												>
													{stateLabel(session.state)}
												</span>
											</span>
											<span className="od-conversation-item__preview">
												{event?.text ?? "No recorded activity yet."}
											</span>
											<span className="od-conversation-item__meta">
												<span>{session.steps} steps</span>
												<span>{relativeTime(session.updatedAt)}</span>
											</span>
										</button>
									);
								})}
							</div>
							{selectedSession ? (
								<article className="od-conversation-detail">
									<div className="od-conversation-detail__head">
										<div>
											<span>Conversation</span>
											<h2>{selectedSession.title}</h2>
										</div>
										<span
											className={cx(
												"od-state-pill",
												`is-${selectedSession.state}`,
											)}
										>
											{stateLabel(selectedSession.state)}
										</span>
									</div>
									<div className="od-conversation-detail__stats">
										<div>
											<span>Steps</span>
											<strong>{selectedSession.steps}</strong>
										</div>
										<div>
											<span>Started</span>
											<strong>{relativeTime(selectedSession.createdAt)}</strong>
										</div>
										<div>
											<span>Updated</span>
											<strong>{relativeTime(selectedSession.updatedAt)}</strong>
										</div>
									</div>
									<div className="od-conversation-events">
										{selectedSession.events.length > 0 ? (
											selectedSession.events.slice(-40).map((event) => (
												<div
													className={cx(
														"od-conversation-event",
														`is-${event.kind}`,
													)}
													key={`${event.at}-${event.kind}-${event.text}`}
												>
													<span>{eventLabel(event.kind)}</span>
													<p>{event.text}</p>
													<small>{relativeTime(event.at)}</small>
												</div>
											))
										) : (
											<div className="od-empty-row">
												<strong>No activity recorded yet.</strong>
												<p>The next agent run will write its steps here.</p>
											</div>
										)}
									</div>
								</article>
							) : null}
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
							description="Agent conversations will appear here with the exact user request, steps, and result."
							icon={<OtterMascot className="od-otter-mascot" />}
							title="No conversations yet"
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

type WebsiteOverview = {
	origins: string[];
	sourceCount: number;
	readySourceCount: number;
};

function useWebsiteOverview(): WebsiteOverview | null {
	const [overview, setOverview] = useState<WebsiteOverview | null>(null);
	useEffect(() => {
		let active = true;
		Promise.all([
			fetch("/api/account/origins").then((response) =>
				response.ok ? response.json() : null,
			),
			fetch("/api/docs").then((response) =>
				response.ok ? response.json() : null,
			),
		])
			.then(
				([originBody, docsBody]: [
					{ origins?: string[] } | null,
					{ docs?: Array<{ status: string }> } | null,
				]) => {
					if (!active) return;
					const docs = docsBody?.docs ?? [];
					setOverview({
						origins: originBody?.origins ?? [],
						sourceCount: docs.length,
						readySourceCount: docs.filter((doc) => doc.status === "ready")
							.length,
					});
				},
			)
			.catch(() => {
				if (active)
					setOverview({ origins: [], sourceCount: 0, readySourceCount: 0 });
			});
		return () => {
			active = false;
		};
	}, []);
	return overview;
}

export function OrganizationPage() {
	const tenantName = useTenantName();
	const overview = useWebsiteOverview();
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
						<h2>Website</h2>
						<p>Manage the site where this Otter agent is installed.</p>
					</div>
					<Link href="/settings/developers">Open install settings</Link>
				</div>
				<div className="od-current-website">
					<div className="od-current-website__mark">
						<Globe2 size={20} />
					</div>
					<div className="od-current-website__body">
						<div>
							<span>Current website</span>
							<strong>{tenantName ?? "Loading…"}</strong>
							<small>
								{overview?.origins[0] ?? "No allowed domain configured yet."}
							</small>
						</div>
						<div className="od-current-website__stats">
							<div>
								<span>Allowed domains</span>
								<strong>{overview?.origins.length ?? 0}</strong>
							</div>
							<div>
								<span>Knowledge sources</span>
								<strong>{overview?.sourceCount ?? 0}</strong>
							</div>
							<div>
								<span>Ready sources</span>
								<strong>{overview?.readySourceCount ?? 0}</strong>
							</div>
						</div>
						<div className="od-current-website__actions">
							<Link href="/agent/knowledge/web-sources">Manage sources</Link>
							<Link href="/settings/developers">Embed settings</Link>
							<Link href="/agent">Agent settings</Link>
						</div>
					</div>
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
