"use client";

import Link from "next/link";
import { DEFAULT_TICKETS, PROJECTS, type Ticket } from "@/components/cordant/data";
import { useStore } from "@/components/cordant/store";
import { Badge, PageHeader } from "@/components/cordant/ui";

export default function Projects() {
	const [tickets] = useStore<Ticket[]>("tickets", DEFAULT_TICKETS);

	return (
		<>
			<PageHeader title="Projects" sub="Every ticket belongs to exactly one project." />
			<div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
				{PROJECTS.map((p) => {
					const projectTickets = tickets.filter((t) => t.projectId === p.id);
					const open = projectTickets.filter((t) => t.status !== "Closed" && t.status !== "Resolved").length;
					return (
						<Link
							key={p.id}
							href={`/demo/projects/${p.id}`}
							className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,17,20,0.04)] transition hover:border-zinc-300"
						>
							<div className="mb-3 flex items-center justify-between">
								<Badge tone="zinc">{p.key}</Badge>
								<span className="text-[11.5px] text-zinc-400">{open} open</span>
							</div>
							<p className="mb-1 text-[14.5px] font-semibold text-zinc-900">{p.name}</p>
							<p className="mb-3 text-[12.5px] leading-relaxed text-zinc-500">{p.description}</p>
							<p className="text-[11.5px] text-zinc-400">Lead: {p.lead}</p>
						</Link>
					);
				})}
			</div>
		</>
	);
}
