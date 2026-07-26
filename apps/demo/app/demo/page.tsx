"use client";

import Link from "next/link";
import {
	type AutomationRule,
	DEFAULT_RULES,
	DEFAULT_TICKETS,
	PROJECTS,
	relTime,
	type Ticket,
} from "@/components/cordant/data";
import { useStore } from "@/components/cordant/store";
import { Avatar, Badge, PageHeader, Panel } from "@/components/cordant/ui";

export default function Overview() {
	const [tickets] = useStore<Ticket[]>("tickets", DEFAULT_TICKETS);
	const [rules] = useStore<AutomationRule[]>("automation-rules", DEFAULT_RULES);
	const [org2fa] = useStore("org-2fa-required", false);

	const open = tickets.filter((t) => t.status === "Open" || t.status === "New");
	const urgent = tickets.filter(
		(t) =>
			t.priority === "Urgent" &&
			t.status !== "Closed" &&
			t.status !== "Resolved",
	);
	const unassigned = tickets.filter(
		(t) => !t.assignee && t.status !== "Closed",
	);
	const activeRules = rules.filter((r) => r.enabled).length;
	const recent = [...tickets]
		.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
		.slice(0, 6);

	return (
		<>
			<PageHeader
				title="Good to see you, Demo"
				sub="Here's what's happening across Acme Support Ops."
			/>

			<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Stat
					label="Open tickets"
					value={String(open.length)}
					href="/demo/tickets"
				/>
				<Stat
					label="Urgent, unresolved"
					value={String(urgent.length)}
					warn={urgent.length > 0}
					href="/demo/tickets"
				/>
				<Stat
					label="Unassigned"
					value={String(unassigned.length)}
					href="/demo/tickets"
				/>
				<Stat
					label="Active automations"
					value={String(activeRules)}
					href="/demo/automation"
				/>
			</div>

			{!org2fa && (
				<div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-[13.5px] font-semibold text-amber-900">
							Org-wide two-factor enforcement is off
						</p>
						<p className="text-[12.5px] text-amber-700">
							Individual members can still enable 2FA on their own account under
							My Settings.
						</p>
					</div>
					<Link
						href="/demo/admin/security"
						className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-amber-600"
					>
						Review org security
					</Link>
				</div>
			)}

			<Panel
				title="Recent activity"
				sub="Latest ticket updates across all projects."
			>
				<ul>
					{recent.map((t) => (
						<li
							key={t.id}
							className="[&:not(:last-child)]:border-b [&:not(:last-child)]:border-zinc-100"
						>
							<Link
								href={`/demo/tickets/${t.id}`}
								className="grid grid-cols-[4.25rem_1fr] gap-x-3 gap-y-1 py-3 transition hover:bg-zinc-50/60 sm:flex sm:items-center sm:gap-3.5"
							>
								<span className="w-16 flex-none font-mono text-[11.5px] text-zinc-400">
									{t.id}
								</span>
								<span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-zinc-800">
									{t.subject}
								</span>
								<StatusDot status={t.status} />
								<span className="text-[11.5px] text-zinc-400 sm:w-28 sm:flex-none sm:text-right">
									{relTime(t.updatedAt)}
								</span>
							</Link>
						</li>
					))}
				</ul>
			</Panel>

			<div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
				<Panel
					title="Projects"
					dense
					footer={
						<Link
							href="/demo/projects"
							className="text-[12.5px] font-semibold text-zinc-600 hover:text-zinc-900"
						>
							View all projects →
						</Link>
					}
				>
					<ul className="px-6 py-2">
						{PROJECTS.map((p) => {
							const count = tickets.filter(
								(t) => t.projectId === p.id && t.status !== "Closed",
							).length;
							return (
								<li
									key={p.id}
									className="flex items-center gap-3 py-2.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-zinc-100"
								>
									<Badge tone="zinc">{p.key}</Badge>
									<span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-800">
										{p.name}
									</span>
									<span className="text-[11.5px] text-zinc-400">
										{count} open
									</span>
								</li>
							);
						})}
					</ul>
				</Panel>

				<Panel
					title="Team"
					dense
					footer={
						<Link
							href="/demo/admin/users"
							className="text-[12.5px] font-semibold text-zinc-600 hover:text-zinc-900"
						>
							Manage users & roles →
						</Link>
					}
				>
					<ul className="px-6 py-2">
						{["Priya Shah", "Marcus Webb", "Elena Kowalski", "Devon Ito"].map(
							(name) => (
								<li
									key={name}
									className="flex items-center gap-3 py-2.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-zinc-100"
								>
									<Avatar name={name} size={26} />
									<span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-800">
										{name}
									</span>
									<span className="text-[11.5px] text-zinc-400">
										{
											tickets.filter(
												(t) =>
													t.assignee === name &&
													t.status !== "Closed" &&
													t.status !== "Resolved",
											).length
										}{" "}
										assigned
									</span>
								</li>
							),
						)}
					</ul>
				</Panel>
			</div>
		</>
	);
}

function Stat({
	label,
	value,
	warn,
	href,
}: {
	label: string;
	value: string;
	warn?: boolean;
	href: string;
}) {
	return (
		<Link
			href={href}
			className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,17,20,0.04)] transition hover:border-zinc-300"
		>
			<p className="text-[12px] font-medium text-zinc-500">{label}</p>
			<p
				className={`mt-1.5 text-2xl font-semibold tracking-tight ${warn ? "text-red-600" : "text-zinc-900"}`}
			>
				{value}
			</p>
		</Link>
	);
}

function StatusDot({ status }: { status: Ticket["status"] }) {
	const color =
		status === "New"
			? "bg-blue-500"
			: status === "Open"
				? "bg-amber-500"
				: status === "Pending"
					? "bg-violet-500"
					: status === "On Hold"
						? "bg-zinc-400"
						: status === "Resolved"
							? "bg-emerald-500"
							: "bg-zinc-300";
	return (
		<span className="flex flex-none items-center gap-1.5 text-[11.5px] text-zinc-500">
			<span className={`h-1.5 w-1.5 rounded-full ${color}`} />
			{status}
		</span>
	);
}
