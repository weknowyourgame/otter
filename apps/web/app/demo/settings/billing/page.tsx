"use client";

import { useStore } from "@/components/nimbus/store";
import { Badge, Button, PageHeader, Panel, Row } from "@/components/nimbus/ui";

const INVOICES = [
	{ id: "INV-2041", date: "Jun 1, 2026", amount: "$49.00", status: "Paid" },
	{ id: "INV-1987", date: "May 1, 2026", amount: "$49.00", status: "Paid" },
	{ id: "INV-1904", date: "Apr 1, 2026", amount: "$49.00", status: "Paid" },
];

export default function Billing() {
	const [plan, setPlan] = useStore<"starter" | "growth">("plan", "starter");

	return (
		<>
			<PageHeader title="Billing" sub="Plan, payment method, and invoices." />

			<Panel title="Current plan">
				<div className="grid gap-4 sm:grid-cols-2">
					<PlanCard
						name="Starter"
						price="$49"
						blurb="Up to 2,000 documents / month"
						current={plan === "starter"}
						onSelect={() => setPlan("starter")}
					/>
					<PlanCard
						name="Growth"
						price="$199"
						blurb="Unlimited documents, priority support"
						current={plan === "growth"}
						onSelect={() => setPlan("growth")}
					/>
				</div>
			</Panel>

			<Panel title="Payment method">
				<Row label="Visa ending in 4242" sub="Expires 04/28">
					<Button>Update card</Button>
				</Row>
			</Panel>

			<Panel title="Invoices">
				<table className="w-full text-left">
					<thead>
						<tr className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
							<th className="pb-3">Invoice</th>
							<th className="pb-3">Date</th>
							<th className="pb-3">Amount</th>
							<th className="pb-3 text-right">Status</th>
						</tr>
					</thead>
					<tbody>
						{INVOICES.map((inv) => (
							<tr key={inv.id} className="border-t border-zinc-100 text-[13.5px]">
								<td className="py-3 font-mono text-[12.5px] text-zinc-700">{inv.id}</td>
								<td className="py-3 text-zinc-600">{inv.date}</td>
								<td className="py-3 text-zinc-800">{inv.amount}</td>
								<td className="py-3 text-right">
									<Badge tone="green">{inv.status}</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</Panel>
		</>
	);
}

function PlanCard({
	name,
	price,
	blurb,
	current,
	onSelect,
}: {
	name: string;
	price: string;
	blurb: string;
	current: boolean;
	onSelect: () => void;
}) {
	return (
		<div
			className={`rounded-xl border p-5 ${current ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200"}`}
		>
			<div className="mb-1 flex items-center justify-between">
				<p className="text-[14px] font-semibold text-zinc-900">{name}</p>
				{current && <Badge tone="blue">Current plan</Badge>}
			</div>
			<p className="mb-1 text-2xl font-semibold tracking-tight text-zinc-900">
				{price}
				<span className="text-[13px] font-normal text-zinc-500"> / month</span>
			</p>
			<p className="mb-4 text-[12.5px] text-zinc-500">{blurb}</p>
			{!current && (
				<Button variant="primary" onClick={onSelect}>
					{name === "Growth" ? "Upgrade to Growth" : "Downgrade to Starter"}
				</Button>
			)}
		</div>
	);
}
