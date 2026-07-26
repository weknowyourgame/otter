"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	type ActionType,
	type AutomationRule,
	type ConditionField,
	DEFAULT_RULES,
	type RuleAction,
	type RuleCondition,
	type TriggerType,
} from "@/components/cordant/data";
import { useStore } from "@/components/cordant/store";
import {
	Badge,
	Button,
	Input,
	PageHeader,
	Panel,
	Select,
	Toggle,
} from "@/components/cordant/ui";

const TRIGGERS: Array<{ value: TriggerType; blurb: string }> = [
	{ value: "Ticket created", blurb: "Fires the moment a new ticket is filed." },
	{
		value: "Ticket updated",
		blurb: "Fires on any field change to an existing ticket.",
	},
	{
		value: "Ticket status changed",
		blurb: "Fires only when the status field changes.",
	},
	{
		value: "SLA breached",
		blurb: "Fires when a ticket misses its response-time target.",
	},
	{ value: "Comment added", blurb: "Fires when anyone comments on a ticket." },
];
const CONDITION_FIELDS: ConditionField[] = [
	"Priority",
	"Project",
	"Status",
	"Label",
	"Requester domain",
];
const ACTION_TYPES: ActionType[] = [
	"Assign to agent",
	"Set priority",
	"Add label",
	"Post internal comment",
	"Send email to requester",
	"Change status",
];

const STEPS = ["Trigger", "Conditions", "Actions", "Review"] as const;
type Step = (typeof STEPS)[number];
type DraftCondition = RuleCondition & { draftId: string };
type DraftAction = RuleAction & { draftId: string };

function draftId(prefix: string): string {
	return `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
}

function conditionFromDraft(condition: DraftCondition): RuleCondition {
	return { field: condition.field, value: condition.value };
}

function actionFromDraft(action: DraftAction): RuleAction {
	return { type: action.type, value: action.value };
}

export default function NewRule() {
	const router = useRouter();
	const [rules, setRules] = useStore<AutomationRule[]>(
		"automation-rules",
		DEFAULT_RULES,
	);

	const [step, setStep] = useState<Step>("Trigger");
	const [trigger, setTrigger] = useState<TriggerType | null>(null);
	const [conditions, setConditions] = useState<DraftCondition[]>([]);
	const [actions, setActions] = useState<DraftAction[]>([]);
	const [name, setName] = useState("");
	const [enabled, setEnabled] = useState(true);

	const stepIndex = STEPS.indexOf(step);
	const goNext = () =>
		setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]);
	const goBack = () => setStep(STEPS[Math.max(stepIndex - 1, 0)]);

	const addCondition = () =>
		setConditions([
			...conditions,
			{ draftId: draftId("condition"), field: "Priority", value: "" },
		]);
	const removeCondition = (i: number) =>
		setConditions(conditions.filter((_, idx) => idx !== i));
	const updateCondition = (i: number, patch: Partial<RuleCondition>) =>
		setConditions(
			conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
		);

	const addAction = () =>
		setActions([
			...actions,
			{ draftId: draftId("action"), type: "Assign to agent", value: "" },
		]);
	const removeAction = (i: number) =>
		setActions(actions.filter((_, idx) => idx !== i));
	const updateAction = (i: number, patch: Partial<RuleAction>) =>
		setActions(actions.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

	const create = () => {
		if (!trigger || !name.trim()) return;
		const rule: AutomationRule = {
			id: `rule-${Date.now()}`,
			name: name.trim(),
			trigger,
			conditions: conditions.map(conditionFromDraft),
			actions: actions.map(actionFromDraft),
			enabled,
		};
		setRules([...rules, rule]);
		router.push("/demo/automation");
	};

	return (
		<>
			<PageHeader
				title="New automation rule"
				crumbs={[
					{ label: "Automation", href: "/demo/automation" },
					{ label: "New rule" },
				]}
			/>

			<div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:items-center">
				{STEPS.map((s, i) => (
					<div key={s} className="flex items-center gap-2">
						<span
							className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
								i < stepIndex
									? "bg-zinc-900 text-white"
									: i === stepIndex
										? "border-2 border-zinc-900 text-zinc-900"
										: "border border-zinc-300 text-zinc-400"
							}`}
						>
							{i + 1}
						</span>
						<span
							className={`text-[12.5px] font-medium ${i === stepIndex ? "text-zinc-900" : "text-zinc-400"}`}
						>
							{s}
						</span>
						{i < STEPS.length - 1 && (
							<span className="mx-1 hidden h-px w-8 bg-zinc-200 sm:block" />
						)}
					</div>
				))}
			</div>

			{step === "Trigger" && (
				<Panel
					title="Step 1 · Choose a trigger"
					sub="What event should start this rule?"
				>
					<div className="space-y-2.5">
						{TRIGGERS.map((t) => (
							<button
								key={t.value}
								type="button"
								onClick={() => setTrigger(t.value)}
								className={`block w-full rounded-lg border px-4 py-3 text-left transition ${
									trigger === t.value
										? "border-zinc-900 bg-zinc-50"
										: "border-zinc-200 hover:border-zinc-300"
								}`}
							>
								<p className="text-[13.5px] font-medium text-zinc-800">
									{t.value}
								</p>
								<p className="mt-0.5 text-[12px] text-zinc-500">{t.blurb}</p>
							</button>
						))}
					</div>
				</Panel>
			)}

			{step === "Conditions" && (
				<Panel
					title="Step 2 · Add conditions"
					sub="All conditions must match for the rule to run. Leave empty to always run."
				>
					<div className="space-y-2.5">
						{conditions.map((c, i) => (
							<div
								key={c.draftId}
								className="grid gap-2 sm:grid-cols-[minmax(0,13rem)_auto_minmax(0,1fr)_2rem] sm:items-center"
							>
								<Select
									aria-label={`Condition ${i + 1} field`}
									value={c.field}
									onChange={(v) =>
										updateCondition(i, { field: v as ConditionField })
									}
									options={CONDITION_FIELDS}
									className="w-full"
								/>
								<span className="hidden text-[12.5px] text-zinc-400 sm:block">
									is
								</span>
								<Input
									aria-label={`Condition ${i + 1} value`}
									placeholder="Value…"
									value={c.value}
									onChange={(e) =>
										updateCondition(i, { value: e.target.value })
									}
								/>
								<button
									type="button"
									aria-label={`Remove condition ${i + 1}`}
									onClick={() => removeCondition(i)}
									className="grid h-8 w-8 flex-none place-items-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
								>
									✕
								</button>
							</div>
						))}
						<Button size="sm" onClick={addCondition}>
							+ Add condition
						</Button>
					</div>
				</Panel>
			)}

			{step === "Actions" && (
				<Panel
					title="Step 3 · Add actions"
					sub="Actions run in order, top to bottom, when the rule triggers."
				>
					<div className="space-y-2.5">
						{actions.map((a, i) => (
							<div
								key={a.draftId}
								className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_2rem] sm:items-center"
							>
								<Select
									aria-label={`Action ${i + 1} type`}
									value={a.type}
									onChange={(v) => updateAction(i, { type: v as ActionType })}
									options={ACTION_TYPES}
									className="w-full"
								/>
								<Input
									aria-label={`Action ${i + 1} value`}
									placeholder="Value…"
									value={a.value}
									onChange={(e) => updateAction(i, { value: e.target.value })}
								/>
								<button
									type="button"
									aria-label={`Remove action ${i + 1}`}
									onClick={() => removeAction(i)}
									className="grid h-8 w-8 flex-none place-items-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
								>
									✕
								</button>
							</div>
						))}
						<Button size="sm" onClick={addAction}>
							+ Add action
						</Button>
					</div>
				</Panel>
			)}

			{step === "Review" && (
				<Panel title="Step 4 · Name and review">
					<div className="mb-5">
						<p className="mb-1.5 text-[12.5px] font-medium text-zinc-600">
							Rule name
						</p>
						<Input
							aria-label="Rule name"
							placeholder="e.g. Escalate urgent billing issues"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<div className="mb-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[12.5px] leading-relaxed text-zinc-700">
						<p>
							<span className="font-semibold">When</span>{" "}
							{trigger ?? "(no trigger selected)"}
						</p>
						{conditions.length > 0 && (
							<p>
								<span className="font-semibold">If</span>{" "}
								{conditions
									.map((c) => `${c.field} is ${c.value || "…"}`)
									.join(" and ")}
							</p>
						)}
						<p>
							<span className="font-semibold">Then</span>{" "}
							{actions.length > 0
								? actions
										.map((a) => `${a.type}${a.value ? ` (${a.value})` : ""}`)
										.join(", ")
								: "(no actions added)"}
						</p>
					</div>
					<div className="flex items-center gap-3">
						<Toggle
							checked={enabled}
							onChange={setEnabled}
							label="Enable rule immediately"
						/>
						<span className="text-[12.5px] text-zinc-600">
							Enable this rule immediately
						</span>
					</div>
				</Panel>
			)}

			<div className="flex flex-wrap items-center gap-2.5">
				{stepIndex > 0 && <Button onClick={goBack}>Back</Button>}
				{step !== "Review" ? (
					<Button
						variant="primary"
						onClick={goNext}
						disabled={step === "Trigger" && !trigger}
					>
						Continue
					</Button>
				) : (
					<Button
						variant="primary"
						onClick={create}
						disabled={!name.trim() || !trigger}
					>
						Create rule
					</Button>
				)}
				{trigger && step !== "Review" && (
					<Badge tone="zinc">Trigger: {trigger}</Badge>
				)}
			</div>
		</>
	);
}
