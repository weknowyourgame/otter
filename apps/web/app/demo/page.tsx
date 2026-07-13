"use client";

import Link from "next/link";
import { useStore } from "@/components/nimbus/store";
import { Badge, PageHeader, Panel } from "@/components/nimbus/ui";

const DOCS = [
	{ name: "Q3 pipeline review", type: "Parse", author: "Demo User", when: "2h ago" },
	{ name: "Vendor contract — Meridian", type: "Parse › Extract", author: "Demo User", when: "5h ago" },
	{ name: "Onboarding checklist", type: "Parse", author: "Ava Chen", when: "1d ago" },
	{ name: "Security policy v4", type: "Parse › Extract", author: "Sam Ortiz", when: "2d ago" },
];

export default function Overview() {
	const [twoFA] = useStore("2fa-enabled", false);
	const [members] = useStore<Array<unknown>>("team-members", []);

	return (
		<>
			<PageHeader title="Good to see you, Demo" sub="Here's what's happening in your workspace." />

			<div className="mb-6 grid grid-cols-3 gap-4 max-sm:grid-cols-1">
				<Stat label="Documents processed" value="1,284" delta="+12% this week" />
				<Stat label="Team members" value={String(3 + members.length)} delta="2 pending invites" />
				<Stat
					label="Security score"
					value={twoFA ? "94" : "61"}
					delta={twoFA ? "2FA enabled ✓" : "2FA not enabled"}
					warn={!twoFA}
				/>
			</div>

			{!twoFA && (
				<div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
					<div>
						<p className="text-[13.5px] font-semibold text-amber-900">
							Two-factor authentication is off
						</p>
						<p className="text-[12.5px] text-amber-700">
							Protect your account — it takes less than a minute.
						</p>
					</div>
					<Link
						href="/demo/settings/security"
						className="rounded-lg bg-amber-500 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-amber-600"
					>
						Review security
					</Link>
				</div>
			)}

			<Panel title="Recent documents" sub="Latest activity across your pipelines.">
				<table className="w-full text-left">
					<thead>
						<tr className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
							<th className="pb-3">Document</th>
							<th className="pb-3">Pipeline</th>
							<th className="pb-3 max-sm:hidden">Author</th>
							<th className="pb-3 text-right">Updated</th>
						</tr>
					</thead>
					<tbody>
						{DOCS.map((d) => (
							<tr key={d.name} className="border-t border-zinc-100 text-[13.5px]">
								<td className="py-3 font-medium text-zinc-800">{d.name}</td>
								<td className="py-3">
									<Badge tone={d.type.includes("Extract") ? "blue" : "zinc"}>{d.type}</Badge>
								</td>
								<td className="py-3 text-zinc-500 max-sm:hidden">{d.author}</td>
								<td className="py-3 text-right text-zinc-400">{d.when}</td>
							</tr>
						))}
					</tbody>
				</table>
			</Panel>
		</>
	);
}

function Stat({ label, value, delta, warn }: { label: string; value: string; delta: string; warn?: boolean }) {
	return (
		<div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,17,20,0.04)]">
			<p className="text-[12px] font-medium text-zinc-500">{label}</p>
			<p className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
			<p className={`mt-1 text-[12px] font-medium ${warn ? "text-amber-600" : "text-zinc-400"}`}>{delta}</p>
		</div>
	);
}
