"use client";

import { useState } from "react";
import { DEFAULT_USERS, type OrgUser } from "@/components/cordant/data";
import { useStore } from "@/components/cordant/store";
import {
	Badge,
	Button,
	Input,
	PageHeader,
	Panel,
	Row,
} from "@/components/cordant/ui";

const WORKSPACE_NAME = "Acme Support Ops";

export default function DangerZone() {
	const [archived, setArchived] = useStore("workspace-archived", false);
	const [users, setUsers] = useStore<OrgUser[]>("org-users", DEFAULT_USERS);
	const [deleteStage, setDeleteStage] = useState<null | "confirm">(null);
	const [confirmText, setConfirmText] = useState("");
	const [transferEmail, setTransferEmail] = useState("");
	const [transferStage, setTransferStage] = useState<null | "confirm">(null);
	const [message, setMessage] = useState("");
	const [deleteScheduled, setDeleteScheduled] = useState(false);
	const transferTarget = transferEmail.trim().toLowerCase();
	const transferReady = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(transferTarget);
	const confirmTransfer = () => {
		if (!transferReady) return;
		setUsers(
			users.map((user) => {
				if (user.email.toLowerCase() === transferTarget)
					return { ...user, role: "Owner" };
				if (user.role === "Owner") return { ...user, role: "Admin" };
				return user;
			}),
		);
		setMessage(`Ownership transfer queued for ${transferTarget}.`);
		setTransferStage(null);
		setTransferEmail("");
	};

	return (
		<>
			<PageHeader
				title="Danger Zone"
				sub="These actions are workspace-wide and mostly irreversible."
				crumbs={[{ label: "Admin console" }, { label: "Danger Zone" }]}
			/>

			{archived && (
				<div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800">
					This workspace is currently archived. Members cannot create new
					tickets until it's restored.
				</div>
			)}
			{message ? (
				<div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-800">
					{message}
				</div>
			) : null}
			{deleteScheduled ? (
				<div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
					Workspace deletion is scheduled. Restore from backups before the
					retention window closes.
				</div>
			) : null}

			<Panel title="Transfer ownership">
				{transferStage === null ? (
					<Row
						label="Transfer ownership"
						sub="Move billing and admin control to another member."
					>
						<Button
							variant="danger"
							onClick={() => setTransferStage("confirm")}
						>
							Transfer ownership
						</Button>
					</Row>
				) : (
					<div className="py-1">
						<p className="mb-3 text-[13px] text-zinc-600">
							Enter the email of the member who will become the new owner.
						</p>
						<div className="mb-4 max-w-sm">
							<Input
								aria-label="New owner email"
								placeholder="priya@cordant.io"
								value={transferEmail}
								onChange={(e) => setTransferEmail(e.target.value)}
							/>
						</div>
						<div className="flex flex-wrap gap-2.5">
							<Button
								variant="danger"
								onClick={confirmTransfer}
								disabled={!transferReady}
							>
								Confirm transfer
							</Button>
							<Button onClick={() => setTransferStage(null)}>Cancel</Button>
						</div>
					</div>
				)}
			</Panel>

			<Panel title="Archive workspace">
				<Row
					label={archived ? "Restore workspace" : "Archive this workspace"}
					sub={
						archived
							? "Bring the workspace back to an active state."
							: "Read-only for all members until restored. Billing continues."
					}
				>
					{archived ? (
						<Button variant="primary" onClick={() => setArchived(false)}>
							Restore workspace
						</Button>
					) : (
						<Button variant="danger" onClick={() => setArchived(true)}>
							Archive workspace
						</Button>
					)}
				</Row>
			</Panel>

			<Panel title="Delete workspace">
				{deleteStage === null ? (
					<Row
						label="Permanently delete this workspace"
						sub="All tickets, projects, and automation rules are permanently erased. This cannot be undone."
					>
						<Button variant="danger" onClick={() => setDeleteStage("confirm")}>
							Delete workspace
						</Button>
					</Row>
				) : (
					<div className="py-1">
						<div className="mb-4 flex flex-wrap items-center gap-2">
							<Badge tone="red">Irreversible</Badge>
							<p className="text-[13px] text-zinc-600">
								Type{" "}
								<span className="font-mono font-semibold text-zinc-900">
									{WORKSPACE_NAME}
								</span>{" "}
								to confirm.
							</p>
						</div>
						<div className="mb-4 max-w-sm">
							<Input
								aria-label="Confirm workspace name"
								placeholder={WORKSPACE_NAME}
								value={confirmText}
								onChange={(e) => setConfirmText(e.target.value)}
							/>
						</div>
						<div className="flex flex-wrap gap-2.5">
							<Button
								variant="danger"
								disabled={confirmText !== WORKSPACE_NAME}
								onClick={() => {
									setDeleteScheduled(true);
									setDeleteStage(null);
									setConfirmText("");
									setMessage("");
								}}
							>
								Permanently delete
							</Button>
							<Button
								onClick={() => {
									setDeleteStage(null);
									setConfirmText("");
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				)}
			</Panel>
		</>
	);
}
