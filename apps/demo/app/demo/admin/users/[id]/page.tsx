"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import {
	DEFAULT_ROLE_PERMISSION_MAP,
	DEFAULT_USERS,
	type OrgUser,
	PERMISSION_GROUPS,
	type UserRole,
} from "@/components/cordant/data";
import { useStore } from "@/components/cordant/store";
import {
	Badge,
	Checkbox,
	PageHeader,
	Panel,
	Select,
} from "@/components/cordant/ui";

const ROLES: UserRole[] = ["Owner", "Admin", "Manager", "Agent", "Viewer"];

export default function UserDetail() {
	const { id } = useParams<{ id: string }>();
	const [users, setUsers] = useStore<OrgUser[]>("org-users", DEFAULT_USERS);
	const [rolePerms, setRolePerms] = useStore<
		Record<UserRole, Record<string, boolean>>
	>("role-permissions", DEFAULT_ROLE_PERMISSION_MAP);

	const user = users.find((u) => u.id === id);
	const [viewingRole, setViewingRole] = useState<UserRole | null>(null);
	const role = viewingRole ?? user?.role ?? "Viewer";

	if (!user) {
		return (
			<Panel>
				<p className="text-[13.5px] text-zinc-500">No user found.</p>
			</Panel>
		);
	}

	const perms = rolePerms[role];
	const togglePerm = (key: string, value: boolean) => {
		setRolePerms({ ...rolePerms, [role]: { ...perms, [key]: value } });
	};
	const memberCount = users.filter((u) => u.role === role).length;

	return (
		<>
			<PageHeader
				title={user.name}
				sub={user.email}
				crumbs={[
					{ label: "Admin console" },
					{ label: "Users & Roles", href: "/demo/admin/users" },
					{ label: user.name },
				]}
			/>

			<Panel title="Membership">
				<div className="flex items-center gap-6">
					<div>
						<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
							Assigned role
						</p>
						<Select
							aria-label="Assigned role"
							value={user.role}
							onChange={(v) =>
								setUsers(
									users.map((u) =>
										u.id === user.id ? { ...u, role: v as UserRole } : u,
									),
								)
							}
							options={ROLES}
						/>
					</div>
					<div>
						<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
							Status
						</p>
						<Badge tone={user.status === "Active" ? "green" : "amber"}>
							{user.status}
						</Badge>
					</div>
				</div>
			</Panel>

			<Panel
				title="Role permissions"
				sub={`Editing permissions for the "${role}" role — applies to all ${memberCount} member${memberCount === 1 ? "" : "s"} with this role, not just ${user.name}.`}
			>
				<div className="mb-4 flex items-center gap-2">
					<span className="text-[12.5px] font-medium text-zinc-600">
						Viewing role:
					</span>
					<Select
						aria-label="Viewing role"
						value={role}
						onChange={(v) => setViewingRole(v as UserRole)}
						options={ROLES}
					/>
				</div>

				{PERMISSION_GROUPS.map((group) => (
					<div key={group.group} className="mb-5 last:mb-0">
						<p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-zinc-400">
							{group.group}
						</p>
						<div className="space-y-2">
							{group.permissions.map((p) => (
								<div
									key={p.key}
									className="flex items-center gap-2.5 rounded-md px-1 py-1 hover:bg-zinc-50"
								>
									<Checkbox
										checked={!!perms[p.key]}
										onChange={(v) => togglePerm(p.key, v)}
										label={p.label}
									/>
									<span className="text-[13px] text-zinc-700">{p.label}</span>
								</div>
							))}
						</div>
					</div>
				))}
			</Panel>
		</>
	);
}
