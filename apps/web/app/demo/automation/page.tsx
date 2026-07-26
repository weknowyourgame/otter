"use client";

import Link from "next/link";
import { type AutomationRule, DEFAULT_RULES } from "@/components/cordant/data";
import { useStore } from "@/components/cordant/store";
import {
	Badge,
	Button,
	KebabIcon,
	Menu,
	PageHeader,
	Panel,
	Toggle,
} from "@/components/cordant/ui";

export default function Automation() {
	const [rules, setRules] = useStore<AutomationRule[]>(
		"automation-rules",
		DEFAULT_RULES,
	);

	const toggleRule = (id: string, enabled: boolean) => {
		setRules(rules.map((r) => (r.id === id ? { ...r, enabled } : r)));
	};
	const removeRule = (id: string) => setRules(rules.filter((r) => r.id !== id));

	return (
		<>
			<PageHeader
				title="Automation"
				sub="Rules run automatically when a trigger fires and all conditions match."
				actions={
					<Link href="/demo/automation/new">
						<Button variant="primary">+ New rule</Button>
					</Link>
				}
			/>

			<Panel dense>
				<ul>
					{rules.map((rule) => (
						<li
							key={rule.id}
							className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-zinc-100"
						>
							<div className="flex items-center gap-3 sm:block">
								<Toggle
									checked={rule.enabled}
									onChange={(v) => toggleRule(rule.id, v)}
									label={`Enable ${rule.name}`}
								/>
								<div className="sm:hidden">
									<Badge tone={rule.enabled ? "green" : "zinc"}>
										{rule.enabled ? "Active" : "Disabled"}
									</Badge>
								</div>
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-[13.5px] font-medium text-zinc-800 sm:truncate">
									{rule.name}
								</p>
								<p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500 sm:truncate">
									When{" "}
									<span className="font-medium text-zinc-700">
										{rule.trigger}
									</span>
									{rule.conditions.length > 0 && (
										<>
											{" "}
											and{" "}
											{rule.conditions
												.map((c) => `${c.field} = ${c.value}`)
												.join(", ")}
										</>
									)}{" "}
									→ {rule.actions.map((a) => a.type).join(", ")}
								</p>
							</div>
							<div className="flex items-center justify-between gap-3 sm:flex-none sm:justify-start">
								<div className="hidden sm:block">
									<Badge tone={rule.enabled ? "green" : "zinc"}>
										{rule.enabled ? "Active" : "Disabled"}
									</Badge>
								</div>
								<Menu
									trigger={<KebabIcon />}
									items={[
										{
											label: "Duplicate",
											onClick: () =>
												setRules([
													...rules,
													{
														...rule,
														id: `${rule.id}-copy`,
														name: `${rule.name} (copy)`,
													},
												]),
										},
										{
											label: "Delete rule",
											onClick: () => removeRule(rule.id),
											danger: true,
										},
									]}
								/>
							</div>
						</li>
					))}
					{rules.length === 0 && (
						<p className="px-6 py-10 text-center text-[13px] text-zinc-400">
							No automation rules yet.
						</p>
					)}
				</ul>
			</Panel>
		</>
	);
}
