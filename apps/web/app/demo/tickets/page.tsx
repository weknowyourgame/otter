"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEFAULT_TICKETS, PROJECTS, priorityTone, relTime, statusTone, type Ticket, type TicketPriority, type TicketStatus } from "@/components/cordant/data";
import { useStore } from "@/components/cordant/store";
import { Avatar, Badge, Button, PageHeader, Panel, Select } from "@/components/cordant/ui";

const STATUSES: Array<TicketStatus | "All statuses"> = ["All statuses", "New", "Open", "Pending", "On Hold", "Resolved", "Closed"];
const PRIORITIES: Array<TicketPriority | "All priorities"> = ["All priorities", "Low", "Medium", "High", "Urgent"];

export default function TicketList() {
	const [tickets, setTickets] = useStore<Ticket[]>("tickets", DEFAULT_TICKETS);
	const [status, setStatus] = useState<string>("All statuses");
	const [priority, setPriority] = useState<string>("All priorities");
	const [project, setProject] = useState<string>("All projects");
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const filtered = useMemo(() => {
		return tickets.filter((t) => {
			if (status !== "All statuses" && t.status !== status) return false;
			if (priority !== "All priorities" && t.priority !== priority) return false;
			if (project !== "All projects" && t.projectId !== PROJECTS.find((p) => p.name === project)?.id) return false;
			if (query && !`${t.id} ${t.subject}`.toLowerCase().includes(query.toLowerCase())) return false;
			return true;
		});
	}, [tickets, status, priority, project, query]);

	const toggle = (id: string) => {
		const next = new Set(selected);
		next.has(id) ? next.delete(id) : next.add(id);
		setSelected(next);
	};
	const toggleAll = () => {
		setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.id)));
	};
	const bulkClose = () => {
		setTickets(tickets.map((t) => (selected.has(t.id) ? { ...t, status: "Closed", updatedAt: new Date().toISOString() } : t)));
		setSelected(new Set());
	};

	return (
		<>
			<PageHeader title="Tickets" sub={`${filtered.length} of ${tickets.length} tickets`} />

			<div className="mb-4 flex flex-wrap items-center gap-2.5">
				<input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search tickets…"
					aria-label="Search tickets"
					className="w-56 rounded-lg border border-zinc-300 px-3 py-2 text-[13px] outline-none focus:border-zinc-500"
				/>
				<Select aria-label="Filter by status" value={status} onChange={setStatus} options={STATUSES} />
				<Select aria-label="Filter by priority" value={priority} onChange={setPriority} options={PRIORITIES} />
				<Select aria-label="Filter by project" value={project} onChange={setProject} options={["All projects", ...PROJECTS.map((p) => p.name)]} />
			</div>

			{selected.size > 0 && (
				<div className="mb-4 flex items-center gap-3 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2.5">
					<span className="text-[12.5px] font-medium text-zinc-700">{selected.size} selected</span>
					<Button size="sm" onClick={bulkClose}>Close selected</Button>
					<Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
				</div>
			)}

			<Panel dense>
				<table className="w-full text-left">
					<thead>
						<tr className="border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
							<th className="w-10 py-3 pl-6">
								<input
									type="checkbox"
									aria-label="Select all tickets"
									checked={filtered.length > 0 && selected.size === filtered.length}
									onChange={toggleAll}
									className="h-3.5 w-3.5"
								/>
							</th>
							<th className="py-3">ID</th>
							<th className="py-3">Subject</th>
							<th className="py-3">Status</th>
							<th className="py-3">Priority</th>
							<th className="py-3">Assignee</th>
							<th className="py-3 pr-6 text-right">Updated</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((t) => (
							<tr key={t.id} className="border-b border-zinc-50 text-[13px] transition hover:bg-zinc-50/60">
								<td className="py-3 pl-6">
									<input type="checkbox" aria-label={`Select ${t.id}`} checked={selected.has(t.id)} onChange={() => toggle(t.id)} className="h-3.5 w-3.5" />
								</td>
								<td className="py-3 font-mono text-[11.5px] text-zinc-400">{t.id}</td>
								<td className="max-w-xs py-3">
									<Link href={`/demo/tickets/${t.id}`} className="truncate font-medium text-zinc-800 hover:text-zinc-950 hover:underline">
										{t.subject}
									</Link>
								</td>
								<td className="py-3">
									<Badge tone={statusTone(t.status)}>{t.status}</Badge>
								</td>
								<td className="py-3">
									<Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
								</td>
								<td className="py-3">
									{t.assignee ? (
										<span className="flex items-center gap-2 text-zinc-700">
											<Avatar name={t.assignee} size={20} />
											<span className="truncate text-[12.5px]">{t.assignee}</span>
										</span>
									) : (
										<span className="text-[12px] text-zinc-400">Unassigned</span>
									)}
								</td>
								<td className="py-3 pr-6 text-right text-[11.5px] text-zinc-400">{relTime(t.updatedAt)}</td>
							</tr>
						))}
						{filtered.length === 0 && (
							<tr>
								<td colSpan={7} className="py-10 text-center text-[13px] text-zinc-400">
									No tickets match these filters.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</Panel>
		</>
	);
}
