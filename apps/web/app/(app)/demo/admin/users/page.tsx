"use client";

import Link from "next/link";
import { useState } from "react";
import { DEFAULT_USERS, type OrgUser, type UserRole } from "@/components/cordant/data";
import { useStore } from "@/components/cordant/store";
import { Avatar, Badge, Button, Input, KebabIcon, Menu, PageHeader, Panel, Select } from "@/components/cordant/ui";

const ROLES: UserRole[] = ["Owner", "Admin", "Manager", "Agent", "Viewer"];

export default function AdminUsers() {
	const [users, setUsers] = useStore<OrgUser[]>("org-users", DEFAULT_USERS);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<UserRole>("Agent");
	const [error, setError] = useState("");

	const invite = () => {
		const value = email.trim().toLowerCase();
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
			setError("Enter a valid email address.");
			return;
		}
		if (users.some((u) => u.email === value)) {
			setError("That person is already a member.");
			return;
		}
		setError("");
		setUsers([
			...users,
			{ id: `u-${Date.now()}`, name: value.split("@")[0], email: value, role, status: "Invited", title: "" },
		]);
		setEmail("");
	};

	const setUserRole = (id: string, r: UserRole) => setUsers(users.map((u) => (u.id === id ? { ...u, role: r } : u)));
	const removeUser = (id: string) => setUsers(users.filter((u) => u.id !== id));

	return (
		<>
			<PageHeader title="Users & Roles" sub="Manage membership and role-based permissions." crumbs={[{ label: "Admin console" }, { label: "Users & Roles" }]} />

			<Panel title="Invite a member">
				<div className="flex max-w-lg gap-2.5 max-sm:flex-col">
					<Input type="email" placeholder="teammate@company.com" aria-label="Invite email" value={email} onChange={(e) => setEmail(e.target.value)} />
					<Select aria-label="Invite role" value={role} onChange={(v) => setRole(v as UserRole)} options={ROLES} />
					<Button variant="primary" onClick={invite} className="flex-none">Send invite</Button>
				</div>
				{error && <p className="mt-2 text-[12.5px] font-medium text-red-600">{error}</p>}
			</Panel>

			<Panel title={`Members · ${users.length}`} dense>
				<table className="w-full text-left">
					<thead>
						<tr className="border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
							<th className="py-3 pl-6">Name</th>
							<th className="py-3">Role</th>
							<th className="py-3">Status</th>
							<th className="w-10 py-3 pr-6" />
						</tr>
					</thead>
					<tbody>
						{users.map((u) => (
							<tr key={u.id} className="border-b border-zinc-50 text-[13px]">
								<td className="py-3 pl-6">
									<Link href={`/demo/admin/users/${u.id}`} className="flex items-center gap-3 hover:underline">
										<Avatar name={u.name} size={26} />
										<div className="min-w-0">
											<p className="truncate font-medium text-zinc-800">{u.name}</p>
											<p className="truncate text-[11.5px] text-zinc-500">{u.email}</p>
										</div>
									</Link>
								</td>
								<td className="py-3">
									<Select aria-label={`Role for ${u.name}`} value={u.role} onChange={(v) => setUserRole(u.id, v as UserRole)} options={ROLES} />
								</td>
								<td className="py-3">
									<Badge tone={u.status === "Active" ? "green" : u.status === "Invited" ? "amber" : "red"}>{u.status}</Badge>
								</td>
								<td className="py-3 pr-6">
									<Menu
										trigger={<KebabIcon />}
										items={[
											{ label: "View permissions", onClick: () => {} },
											{ label: "Suspend member", onClick: () => setUsers(users.map((x) => (x.id === u.id ? { ...x, status: "Suspended" } : x))) },
											{ label: "Remove from workspace", onClick: () => removeUser(u.id), danger: true },
										]}
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</Panel>
		</>
	);
}
