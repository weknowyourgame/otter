"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DEFAULT_TICKETS, type Ticket } from "./data";
import { useStore } from "./store";

const WORKSPACE_NAV = [
	{ href: "/demo", label: "Home", icon: <path d="M3.5 12.5l8.5-8 8.5 8M6 10.5V20h12v-9.5" /> },
	{ href: "/demo/tickets", label: "Tickets", icon: <path d="M4 6.5h16v11H4v-11zM4 10.5h16M8 14.5h4" /> },
	{ href: "/demo/projects", label: "Projects", icon: <path d="M4 5.5h6l2 2.5h8v10.5H4v-13z" /> },
	{ href: "/demo/automation", label: "Automation", icon: <path d="M12 3v3.5M12 17.5V21M4.5 12H8M16 12h3.5M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M17.7 6.3l-2.5 2.5M8.8 15.2l-2.5 2.5" /> },
];

const PERSONAL_NAV = [
	{ href: "/demo/settings/profile", label: "Profile" },
	{ href: "/demo/settings/security", label: "Security" },
	{ href: "/demo/settings/notifications", label: "Notifications" },
];

const ADMIN_NAV = [
	{ href: "/demo/admin", label: "General" },
	{ href: "/demo/admin/security", label: "Security & SSO" },
	{ href: "/demo/admin/users", label: "Users & Roles" },
	{ href: "/demo/admin/billing", label: "Billing" },
	{ href: "/demo/admin/integrations", label: "Integrations" },
	{ href: "/demo/admin/danger-zone", label: "Danger Zone" },
];

function CordantMark() {
	return (
		<svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M17.5 12a5.5 5.5 0 10-11 0M6.5 12a5.5 5.5 0 1011 0" />
		</svg>
	);
}

export function CordantShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const [tickets] = useStore<Ticket[]>("tickets", DEFAULT_TICKETS);
	const openCount = tickets.filter((t) => t.status === "Open" || t.status === "New").length;

	const inAdmin = pathname?.startsWith("/demo/admin");
	const inSettings = pathname?.startsWith("/demo/settings");
	const context = inAdmin ? "admin" : inSettings ? "settings" : "workspace";

	return (
		<div className="flex min-h-screen bg-zinc-50 text-zinc-900">
			<aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-zinc-200 bg-white max-md:hidden">
				<div className="flex items-center gap-2.5 border-b border-zinc-100 px-5" style={{ height: 60 }}>
					<span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600">
						<CordantMark />
					</span>
					<div className="min-w-0">
						<p className="truncate text-[13.5px] font-semibold leading-tight tracking-tight text-zinc-900">
							Acme Support Ops
						</p>
						<p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Cordant</p>
					</div>
				</div>

				<nav className="flex-1 overflow-y-auto px-3 py-5">
					{context === "admin" && (
						<>
							<Link href="/demo" className="mb-4 flex items-center gap-1.5 px-2.5 text-[12px] font-medium text-zinc-500 transition hover:text-zinc-800">
								<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M15 5l-7 7 7 7" />
								</svg>
								Back to workspace
							</Link>
							<p className="mb-1.5 px-2.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Admin console</p>
							{ADMIN_NAV.map((item) => (
								<NavLink key={item.href} href={item.href} label={item.label} active={pathname === item.href} danger={item.label === "Danger Zone"} />
							))}
						</>
					)}

					{context === "settings" && (
						<>
							<Link href="/demo" className="mb-4 flex items-center gap-1.5 px-2.5 text-[12px] font-medium text-zinc-500 transition hover:text-zinc-800">
								<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M15 5l-7 7 7 7" />
								</svg>
								Back to workspace
							</Link>
							<p className="mb-1.5 px-2.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">My settings</p>
							{PERSONAL_NAV.map((item) => (
								<NavLink key={item.href} href={item.href} label={item.label} active={pathname === item.href} />
							))}
						</>
					)}

					{context === "workspace" && (
						<>
							<p className="mb-1.5 px-2.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Workspace</p>
							{WORKSPACE_NAV.map((item) => (
								<NavLink
									key={item.href}
									href={item.href}
									label={item.label}
									icon={item.icon}
									active={pathname === item.href}
									count={item.label === "Tickets" ? openCount : undefined}
								/>
							))}
							<p className="mb-1.5 mt-6 px-2.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Shortcuts</p>
							<Link href="/demo/settings/profile" className="mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900">
								<GearIcon /> My settings
							</Link>
							<Link href="/demo/admin" className="mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900">
								<ShieldIcon /> Admin console
							</Link>
						</>
					)}
				</nav>

				<div className="border-t border-zinc-100 p-4">
					<div className="flex items-center gap-2.5">
						<span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-[12px] font-bold text-white">D</span>
						<div className="min-w-0">
							<p className="truncate text-[13px] font-medium text-zinc-800">Demo User</p>
							<p className="truncate text-[11.5px] text-zinc-500">demo@cordant.io</p>
						</div>
					</div>
				</div>
			</aside>

			<div className="flex-1 md:pl-60">
				<header className="sticky top-0 z-20 flex items-center gap-4 border-b border-zinc-200 bg-white/85 px-6 backdrop-blur-lg md:px-8" style={{ height: 60 }}>
					<div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-zinc-400 max-w-md">
						<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
							<circle cx="11" cy="11" r="7" />
							<path d="M21 21l-4.3-4.3" />
						</svg>
						<span className="truncate text-[12.5px]">Search tickets, projects, people…</span>
					</div>
					<p className="hidden truncate text-[12.5px] text-zinc-400 lg:block">
						Live demo — try asking Otto <em className="text-zinc-600">"enable 2FA"</em> and see what it finds.
					</p>
					<Link href="/" className="flex-none text-[13px] font-semibold text-zinc-400 transition hover:text-zinc-900">
						← otto.dev
					</Link>
				</header>
				<main className="mx-auto max-w-4xl px-6 py-9 md:px-10">{children}</main>
			</div>
		</div>
	);
}

function NavLink({
	href,
	label,
	icon,
	active,
	count,
	danger,
}: {
	href: string;
	label: string;
	icon?: ReactNode;
	active?: boolean;
	count?: number;
	danger?: boolean;
}) {
	return (
		<Link
			href={href}
			className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition ${
				active
					? danger
						? "bg-red-50 text-red-700"
						: "bg-indigo-50 text-indigo-700"
					: danger
						? "text-red-500 hover:bg-red-50"
						: "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900"
			}`}
		>
			{icon && (
				<svg viewBox="0 0 24 24" className={`h-[17px] w-[17px] flex-none ${active ? "text-indigo-600" : "text-zinc-400"}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
					{icon}
				</svg>
			)}
			<span className="flex-1 truncate">{label}</span>
			{count !== undefined && count > 0 && (
				<span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>
			)}
		</Link>
	);
}

function GearIcon() {
	return (
		<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-zinc-400">
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 13.5a7.5 7.5 0 000-3l1.9-1.5-2-3.4-2.3.7a7.6 7.6 0 00-2.6-1.5L14 2.5h-4l-.4 2.3a7.6 7.6 0 00-2.6 1.5l-2.3-.7-2 3.4L4.6 10.5a7.5 7.5 0 000 3L2.7 15l2 3.4 2.3-.7c.76.66 1.64 1.17 2.6 1.5l.4 2.3h4l.4-2.3a7.6 7.6 0 002.6-1.5l2.3.7 2-3.4-1.9-1.5z" />
		</svg>
	);
}
function ShieldIcon() {
	return (
		<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-zinc-400">
			<path d="M12 3l7.5 3v5.2c0 4.6-3.2 8.2-7.5 9.8-4.3-1.6-7.5-5.2-7.5-9.8V6L12 3z" />
		</svg>
	);
}
