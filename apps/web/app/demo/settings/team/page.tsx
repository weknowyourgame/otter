"use client";

import { useState } from "react";
import { useStore } from "@/components/nimbus/store";
import { Badge, Button, Input, PageHeader, Panel } from "@/components/nimbus/ui";

interface Member {
	name: string;
	email: string;
	role: string;
	pending?: boolean;
}

const CORE: Member[] = [
	{ name: "Demo User", email: "demo@nimbus.io", role: "Owner" },
	{ name: "Ava Chen", email: "ava@nimbus.io", role: "Admin" },
	{ name: "Sam Ortiz", email: "sam@nimbus.io", role: "Member" },
];

export default function Team() {
	const [invited, setInvited] = useStore<Member[]>("team-members", []);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("Member");
	const [error, setError] = useState("");

	const invite = () => {
		const value = email.trim().toLowerCase();
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
			setError("Enter a valid email address.");
			return;
		}
		if ([...CORE, ...invited].some((m) => m.email === value)) {
			setError("That person is already on the team.");
			return;
		}
		setError("");
		setInvited([...invited, { name: value.split("@")[0], email: value, role, pending: true }]);
		setEmail("");
	};

	const members = [...CORE, ...invited];

	return (
		<>
			<PageHeader title="Team" sub="Manage who has access to this workspace." />

			<Panel title="Invite a teammate" sub="They'll get an email with a join link.">
				<div className="flex max-w-lg gap-2.5 max-sm:flex-col">
					<Input
						type="email"
						placeholder="teammate@company.com"
						aria-label="Invite email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
					<select
						aria-label="Role"
						value={role}
						onChange={(e) => setRole(e.target.value)}
						className="rounded-lg border border-zinc-300 px-3 py-2 text-[13.5px] text-zinc-700 outline-none focus:border-zinc-500"
					>
						<option>Member</option>
						<option>Admin</option>
						<option>Viewer</option>
					</select>
					<Button variant="primary" onClick={invite} className="flex-none">
						Send invite
					</Button>
				</div>
				{error && <p className="mt-2 text-[12.5px] font-medium text-red-600">{error}</p>}
			</Panel>

			<Panel title={`Members · ${members.length}`}>
				<ul>
					{members.map((m) => (
						<li
							key={m.email}
							className="flex items-center gap-3.5 py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-zinc-100"
						>
							<span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600 text-[12px] font-bold text-white">
								{m.name[0]?.toUpperCase()}
							</span>
							<div className="min-w-0 flex-1">
								<p className="truncate text-[13.5px] font-medium text-zinc-800">{m.name}</p>
								<p className="truncate text-[12px] text-zinc-500">{m.email}</p>
							</div>
							{m.pending && <Badge tone="amber">Invite pending</Badge>}
							<Badge tone={m.role === "Owner" ? "blue" : "zinc"}>{m.role}</Badge>
							{m.pending && (
								<Button
									variant="danger"
									onClick={() => setInvited(invited.filter((i) => i.email !== m.email))}
								>
									Revoke
								</Button>
							)}
						</li>
					))}
				</ul>
			</Panel>
		</>
	);
}
