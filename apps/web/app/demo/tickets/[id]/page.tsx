"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import {
	AGENT_NAMES,
	type Comment,
	DEFAULT_TICKETS,
	PROJECTS,
	relTime,
	STATUS_WORKFLOW,
	statusTone,
	type Ticket,
	type TicketPriority,
} from "@/components/cordant/data";
import { useStore } from "@/components/cordant/store";
import {
	Avatar,
	Badge,
	Button,
	Combobox,
	KebabIcon,
	Menu,
	PageHeader,
	Panel,
	Select,
	Tabs,
	Textarea,
} from "@/components/cordant/ui";

export default function TicketDetail() {
	const { id } = useParams<{ id: string }>();
	const [tickets, setTickets] = useStore<Ticket[]>("tickets", DEFAULT_TICKETS);
	const [tab, setTab] = useState("Details");
	const [comment, setComment] = useState("");
	const [statusMenuOpen, setStatusMenuOpen] = useState(false);
	const [notice, setNotice] = useState("");
	const [mergeOpen, setMergeOpen] = useState(false);
	const [mergeTarget, setMergeTarget] = useState("");

	const ticket = tickets.find((t) => t.id === id);
	if (!ticket) {
		return (
			<Panel>
				<p className="text-[13.5px] text-zinc-500">
					No ticket found with id "{id}".
				</p>
			</Panel>
		);
	}

	const project = PROJECTS.find((p) => p.id === ticket.projectId);
	const update = (patch: Partial<Ticket>) => {
		setTickets(
			tickets.map((t) =>
				t.id === ticket.id
					? { ...t, ...patch, updatedAt: new Date().toISOString() }
					: t,
			),
		);
	};
	const addComment = () => {
		if (!comment.trim()) return;
		const entry: Comment = {
			author: "Demo User",
			at: new Date().toISOString(),
			text: comment.trim(),
		};
		update({ comments: [...ticket.comments, entry] });
		setComment("");
	};
	const commentKey = (entry: Comment) =>
		`${entry.at}-${entry.author}-${entry.text}`;
	const copyTicketLink = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setNotice("Ticket link copied.");
		} catch {
			setNotice(`Copy this link: ${window.location.href}`);
		}
	};
	const mergeTicket = () => {
		const target = tickets.find((t) => t.id === mergeTarget);
		if (!target) return;
		const now = new Date().toISOString();
		const sourceNote: Comment = {
			author: "Demo User",
			at: now,
			internal: true,
			text: `Merged into ${target.id}.`,
		};
		const targetNote: Comment = {
			author: "Demo User",
			at: now,
			internal: true,
			text: `Merged ${ticket.id}: ${ticket.subject}`,
		};
		setTickets(
			tickets.map((t) => {
				if (t.id === ticket.id) {
					return {
						...t,
						status: "Closed",
						labels: Array.from(new Set([...t.labels, "merged"])),
						comments: [...t.comments, sourceNote],
						updatedAt: now,
					};
				}
				if (t.id === target.id) {
					return {
						...t,
						comments: [...t.comments, targetNote],
						updatedAt: now,
					};
				}
				return t;
			}),
		);
		setMergeOpen(false);
		setMergeTarget("");
		setNotice(`${ticket.id} merged into ${target.id}.`);
	};

	return (
		<>
			<PageHeader
				title={ticket.subject}
				crumbs={[
					{ label: "Tickets", href: "/demo/tickets" },
					{ label: project?.key ?? "", href: `/demo/projects/${project?.id}` },
					{ label: ticket.id },
				]}
				actions={
					<Menu
						trigger={<KebabIcon />}
						items={[
							{ label: "Copy ticket link", onClick: copyTicketLink },
							{
								label: "Merge into another ticket",
								onClick: () => setMergeOpen(true),
							},
							{
								label: "Delete ticket",
								onClick: () => {
									update({ status: "Closed" });
									setNotice("Ticket closed and moved out of the active queue.");
								},
								danger: true,
							},
						]}
					/>
				}
			/>
			{notice ? (
				<div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-800">
					{notice}
				</div>
			) : null}
			{mergeOpen ? (
				<Panel
					title="Merge ticket"
					sub="Choose the ticket that should keep the combined history."
				>
					<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
						<Select
							aria-label="Merge target"
							value={mergeTarget}
							onChange={setMergeTarget}
							options={[
								"",
								...tickets.filter((t) => t.id !== ticket.id).map((t) => t.id),
							]}
							className="w-full"
						/>
						<Button
							variant="primary"
							onClick={mergeTicket}
							disabled={!mergeTarget}
						>
							Merge
						</Button>
						<Button
							onClick={() => {
								setMergeOpen(false);
								setMergeTarget("");
							}}
						>
							Cancel
						</Button>
					</div>
				</Panel>
			) : null}

			<div className="grid grid-cols-[1fr_260px] gap-6 max-lg:grid-cols-1">
				<div>
					<Tabs
						tabs={["Details", "Activity", "Attachments"]}
						active={tab}
						onChange={setTab}
					/>

					{tab === "Details" && (
						<>
							<Panel title="Description">
								<p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-zinc-700">
									{ticket.description}
								</p>
							</Panel>
							<Panel
								title="Comments"
								dense
								footer={
									<CommentComposer
										value={comment}
										onChange={setComment}
										onSubmit={addComment}
									/>
								}
							>
								<ul className="px-6 py-2">
									{ticket.comments.length === 0 && (
										<p className="py-4 text-[12.5px] text-zinc-400">
											No comments yet.
										</p>
									)}
									{ticket.comments.map((c) => (
										<li
											key={commentKey(c)}
											className="flex gap-3 py-3.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-zinc-100"
										>
											<Avatar name={c.author} size={28} />
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<span className="text-[12.5px] font-semibold text-zinc-800">
														{c.author}
													</span>
													{c.internal && (
														<Badge tone="amber">Internal note</Badge>
													)}
													<span className="text-[11px] text-zinc-400">
														{relTime(c.at)}
													</span>
												</div>
												<p className="mt-1 text-[13px] leading-relaxed text-zinc-700">
													{c.text}
												</p>
											</div>
										</li>
									))}
								</ul>
							</Panel>
						</>
					)}

					{tab === "Activity" && (
						<Panel title="Activity log">
							<ul className="space-y-3">
								<ActivityRow
									text={`Ticket created by ${ticket.requester}`}
									at={ticket.createdAt}
								/>
								{ticket.comments.map((c) => (
									<ActivityRow
										key={commentKey(c)}
										text={`${c.author} commented`}
										at={c.at}
									/>
								))}
								<ActivityRow text="Last updated" at={ticket.updatedAt} />
							</ul>
						</Panel>
					)}

					{tab === "Attachments" && (
						<Panel title="Attachments">
							<p className="text-[13px] text-zinc-400">
								No files attached to this ticket.
							</p>
						</Panel>
					)}
				</div>

				<div>
					<Panel title="Details" dense>
						<div className="space-y-4 px-5 py-4">
							<Field label="Status">
								<div className="relative">
									<button
										type="button"
										onClick={() => setStatusMenuOpen((v) => !v)}
										className="w-full text-left"
										aria-haspopup="listbox"
									>
										<Badge tone={statusTone(ticket.status)}>
											{ticket.status} ▾
										</Badge>
									</button>
									{statusMenuOpen && (
										<div className="absolute left-0 top-8 z-20 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
											{STATUS_WORKFLOW[ticket.status].map((next) => (
												<button
													key={next}
													type="button"
													onClick={() => {
														update({ status: next });
														setStatusMenuOpen(false);
													}}
													className="block w-full px-3 py-2 text-left text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-50"
												>
													Move to {next}
												</button>
											))}
										</div>
									)}
								</div>
							</Field>

							<Field label="Priority">
								<Select
									aria-label="Priority"
									value={ticket.priority}
									onChange={(v) => update({ priority: v as TicketPriority })}
									options={["Low", "Medium", "High", "Urgent"]}
									className="w-full"
								/>
							</Field>

							<Field label="Assignee">
								<Combobox
									aria-label="Assignee"
									value={ticket.assignee}
									onChange={(v) => update({ assignee: v })}
									options={AGENT_NAMES}
									placeholder="Unassigned"
								/>
							</Field>

							<Field label="Project">
								<span className="text-[13px] font-medium text-zinc-700">
									{project?.name}
								</span>
							</Field>

							<Field label="Requester">
								<span className="truncate text-[13px] text-zinc-700">
									{ticket.requester}
								</span>
							</Field>

							<Field label="Labels">
								<div className="flex flex-wrap gap-1.5">
									{ticket.labels.map((l) => (
										<Badge key={l} tone="zinc">
											{l}
										</Badge>
									))}
								</div>
							</Field>
						</div>
					</Panel>
				</div>
			</div>
		</>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
				{label}
			</p>
			{children}
		</div>
	);
}

function ActivityRow({ text, at }: { text: string; at: string }) {
	return (
		<li className="flex items-center gap-3 text-[13px]">
			<span className="h-1.5 w-1.5 flex-none rounded-full bg-zinc-300" />
			<span className="flex-1 text-zinc-700">{text}</span>
			<span className="text-[11.5px] text-zinc-400">{relTime(at)}</span>
		</li>
	);
}

function CommentComposer({
	value,
	onChange,
	onSubmit,
}: {
	value: string;
	onChange: (v: string) => void;
	onSubmit: () => void;
}) {
	return (
		<div className="flex flex-col gap-2.5 sm:flex-row">
			<Textarea
				rows={2}
				placeholder="Write a comment…"
				aria-label="Write a comment"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="flex-1"
			/>
			<Button variant="primary" onClick={onSubmit} className="self-end">
				Comment
			</Button>
		</div>
	);
}
