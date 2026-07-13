"use client";

import { Badge, Button, PageHeader, Panel } from "@/components/nimbus/ui";

const DOCS = [
	{ name: "Q3 pipeline review", type: "Parse", status: "Processed", files: 3 },
	{ name: "Vendor contract — Meridian", type: "Parse › Extract", status: "Processed", files: 1 },
	{ name: "Onboarding checklist", type: "Parse", status: "Processing", files: 2 },
	{ name: "Security policy v4", type: "Parse › Extract", status: "Processed", files: 1 },
	{ name: "Invoice batch — June", type: "Extract", status: "Failed", files: 12 },
];

export default function Documents() {
	return (
		<>
			<PageHeader title="Documents" sub="Everything your pipelines have touched." />
			<Panel title="All documents" sub="5 documents · 19 files">
				<table className="w-full text-left">
					<thead>
						<tr className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
							<th className="pb-3">Name</th>
							<th className="pb-3">Pipeline</th>
							<th className="pb-3">Status</th>
							<th className="pb-3 text-right">Files</th>
						</tr>
					</thead>
					<tbody>
						{DOCS.map((d) => (
							<tr key={d.name} className="border-t border-zinc-100 text-[13.5px]">
								<td className="py-3 font-medium text-zinc-800">{d.name}</td>
								<td className="py-3">
									<Badge tone={d.type.includes("Extract") ? "blue" : "zinc"}>{d.type}</Badge>
								</td>
								<td className="py-3">
									<Badge tone={d.status === "Processed" ? "green" : d.status === "Failed" ? "red" : "amber"}>
										{d.status}
									</Badge>
								</td>
								<td className="py-3 text-right text-zinc-500">{d.files}</td>
							</tr>
						))}
					</tbody>
				</table>
			</Panel>
			<Button variant="primary">New pipeline</Button>
		</>
	);
}
