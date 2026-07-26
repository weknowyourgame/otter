"use client";

import { useStore } from "@/components/cordant/store";
import { Badge, Button, PageHeader, Panel, Row } from "@/components/cordant/ui";

const INVOICES = [
	{ id: "INV-2041", date: "Jun 1, 2026", amount: "$249.00", status: "Paid" },
	{ id: "INV-1987", date: "May 1, 2026", amount: "$249.00", status: "Paid" },
	{ id: "INV-1904", date: "Apr 1, 2026", amount: "$249.00", status: "Paid" },
];

export default function AdminBilling() {
	const [plan, setPlan] = useStore<"team" | "business" | "enterprise">(
		"plan",
		"team",
	);

	return (
		<>
			<PageHeader
				title="Billing"
				sub="Plan, payment method, and invoices for the whole workspace."
				crumbs={[{ label: "Admin console" }, { label: "Billing" }]}
			/>

			<Panel title="Current plan">
				<div className="grid gap-4 sm:grid-cols-3">
					<PlanCard
						name="Team"
						price="$249"
						blurb="Up to 25 seats, 10k tickets/mo"
						current={plan === "team"}
						onSelect={() => setPlan("team")}
					/>
					<PlanCard
						name="Business"
						price="$799"
						blurb="Unlimited seats, automation, SSO"
						current={plan === "business"}
						onSelect={() => setPlan("business")}
					/>
					<PlanCard
						name="Enterprise"
						price="Custom"
						blurb="Dedicated support, audit exports"
						current={plan === "enterprise"}
						onSelect={() => setPlan("enterprise")}
					/>
				</div>
			</Panel>

			<Panel title="Payment method">
				<Row label="Visa ending in 4242" sub="Expires 04/28">
					<Button>Update card</Button>
				</Row>
			</Panel>

			<Panel title="Invoices">
				<table className="hidden w-full text-left sm:table">
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
							<tr
								key={inv.id}
								className="border-t border-zinc-100 text-[13.5px]"
							>
								<td className="py-3 font-mono text-[12.5px] text-zinc-700">
									{inv.id}
								</td>
								<td className="py-3 text-zinc-600">{inv.date}</td>
								<td className="py-3 text-zinc-800">{inv.amount}</td>
								<td className="py-3 text-right">
									<Badge tone="green">{inv.status}</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				<ul className="divide-y divide-zinc-100 sm:hidden">
					{INVOICES.map((inv) => (
						<li
							key={inv.id}
							className="flex items-center justify-between gap-3 py-3"
						>
							<div>
								<p className="font-mono text-[12.5px] font-semibold text-zinc-800">
									{inv.id}
								</p>
								<p className="text-[12px] text-zinc-500">
									{inv.date} · {inv.amount}
								</p>
							</div>
							<Badge tone="green">{inv.status}</Badge>
						</li>
					))}
				</ul>
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
				{price !== "Custom" && (
					<span className="text-[13px] font-normal text-zinc-500">
						{" "}
						/ month
					</span>
				)}
			</p>
			<p className="mb-4 text-[12.5px] text-zinc-500">{blurb}</p>
			{!current && (
				<Button variant="primary" onClick={onSelect}>
					Switch to {name}
				</Button>
			)}
		</div>
	);
}
