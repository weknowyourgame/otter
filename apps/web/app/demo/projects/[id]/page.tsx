"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DEFAULT_TICKETS, PROJECTS, priorityTone, relTime, statusTone, type Ticket } from "@/components/cordant/data";
import { useStore } from "@/components/cordant/store";
import { Badge, PageHeader, Panel } from "@/components/cordant/ui";

export default function ProjectDetail() {
	const { id } = useParams<{ id: string }>();
	const [tickets] = useStore<Ticket[]>("tickets", DEFAULT_TICKETS);
	const project = PROJECTS.find((p) => p.id === id);

	if (!project) {
		return (
			<Panel>
				<p className="text-[13.5px] text-zinc-500">No project found.</p>
			</Panel>
		);
	}

	const projectTickets = tickets.filter((t) => t.projectId === project.id);

	return (
		<>
			<PageHeader
				title={project.name}
				sub={project.description}
				crumbs={[{ label: "Projects", href: "/demo/projects" }, { label: project.key }]}
			/>

			<Panel title={`Tickets · ${projectTickets.length}`} sub={`Project lead: ${project.lead}`} dense>
				<table className="w-full text-left">
					<thead>
						<tr className="border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
							<th className="py-3 pl-6">ID</th>
							<th className="py-3">Subject</th>
							<th className="py-3">Status</th>
							<th className="py-3">Priority</th>
							<th className="py-3 pr-6 text-right">Updated</th>
						</tr>
					</thead>
					<tbody>
						{projectTickets.map((t) => (
							<tr key={t.id} className="border-b border-zinc-50 text-[13px] transition hover:bg-zinc-50/60">
								<td className="py-3 pl-6 font-mono text-[11.5px] text-zinc-400">{t.id}</td>
								<td className="max-w-xs py-3">
									<Link href={`/demo/tickets/${t.id}`} className="truncate font-medium text-zinc-800 hover:underline">
										{t.subject}
									</Link>
								</td>
								<td className="py-3">
									<Badge tone={statusTone(t.status)}>{t.status}</Badge>
								</td>
								<td className="py-3">
									<Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
								</td>
								<td className="py-3 pr-6 text-right text-[11.5px] text-zinc-400">{relTime(t.updatedAt)}</td>
							</tr>
						))}
						{projectTickets.length === 0 && (
							<tr>
								<td colSpan={5} className="py-10 text-center text-[13px] text-zinc-400">
									No tickets in this project yet.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</Panel>
		</>
	);
}
