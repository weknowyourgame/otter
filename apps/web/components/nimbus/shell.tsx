"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV: Array<{ section: string; items: Array<{ href: string; label: string; icon: ReactNode }> }> = [
	{
		section: "Workspace",
		items: [
			{
				href: "/demo",
				label: "Overview",
				icon: <path d="M3.5 12.5l8.5-8 8.5 8M6 10.5V20h12v-9.5" />,
			},
			{
				href: "/demo/documents",
				label: "Documents",
				icon: <path d="M7 3.5h7L19 8.5v12H7v-17zM13.5 3.5v5.5H19" />,
			},
		],
	},
	{
		section: "Settings",
		items: [
			{ href: "/demo/settings/profile", label: "Profile", icon: <path d="M12 11.5a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM4.5 20c.8-3.5 3.9-5.5 7.5-5.5s6.7 2 7.5 5.5" /> },
			{ href: "/demo/settings/security", label: "Security", icon: <path d="M12 3l7.5 3v5.2c0 4.6-3.2 8.2-7.5 9.8-4.3-1.6-7.5-5.2-7.5-9.8V6L12 3z" /> },
			{ href: "/demo/settings/notifications", label: "Notifications", icon: <path d="M6 9.5a6 6 0 1112 0c0 5 2 6.5 2 6.5H4s2-1.5 2-6.5zM10 19.5a2.2 2.2 0 004 0" /> },
			{ href: "/demo/settings/team", label: "Team", icon: <path d="M9 11a3 3 0 100-6 3 3 0 000 6zM3.5 19c.6-2.8 2.9-4.5 5.5-4.5s4.9 1.7 5.5 4.5M16 11a2.5 2.5 0 100-5M17.5 14.8c1.6.5 2.7 1.7 3 4.2" /> },
			{ href: "/demo/settings/billing", label: "Billing", icon: <path d="M3.5 7.5h17v11h-17v-11zM3.5 10.5h17M6.5 15h4" /> },
			{ href: "/demo/settings/api", label: "API keys", icon: <path d="M14.5 9.5a5 5 0 10-4.7 6.6L12 14h2v-2h2l1.5-1.5a5 5 0 00-3-1zM15 9l.01-.01" /> },
		],
	},
];

export function NimbusShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	return (
		<div className="flex min-h-screen">
			<aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-zinc-200 bg-white max-md:hidden">
				<div className="flex h-15 items-center gap-2.5 border-b border-zinc-100 px-5" style={{ height: 60 }}>
					<span className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-900 text-white">
						<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M17.5 18a4 4 0 000-8 6 6 0 00-11.6 1.6A3.6 3.6 0 006.5 18h11z" />
						</svg>
					</span>
					<span className="text-[15px] font-semibold tracking-tight">Nimbus</span>
					<span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">
						demo
					</span>
				</div>
				<nav className="flex-1 overflow-y-auto px-3 py-5">
					{NAV.map((group) => (
						<div key={group.section} className="mb-6">
							<p className="mb-1.5 px-2.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">
								{group.section}
							</p>
							{group.items.map((item) => {
								const active = pathname === item.href;
								return (
									<Link
										key={item.href}
										href={item.href}
										className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition ${
											active
												? "bg-zinc-100 text-zinc-900"
												: "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
										}`}
									>
										<svg viewBox="0 0 24 24" className={`h-[17px] w-[17px] ${active ? "text-zinc-900" : "text-zinc-400"}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
											{item.icon}
										</svg>
										{item.label}
									</Link>
								);
							})}
						</div>
					))}
				</nav>
				<div className="border-t border-zinc-100 p-4">
					<div className="flex items-center gap-2.5">
						<span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-[12px] font-bold text-white">
							D
						</span>
						<div className="min-w-0">
							<p className="truncate text-[13px] font-medium text-zinc-800">Demo User</p>
							<p className="truncate text-[11.5px] text-zinc-500">demo@nimbus.io</p>
						</div>
					</div>
				</div>
			</aside>
			<div className="flex-1 md:pl-60">
				<header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-white/85 px-6 backdrop-blur-lg md:px-10" style={{ height: 60 }}>
					<p className="text-[13px] text-zinc-500">
						This is a <span className="font-semibold text-zinc-800">live demo workspace</span> —
						everything here actually works. Try asking Otto:{" "}
						<em className="text-zinc-700">“enable 2FA for me”</em>
					</p>
					<Link href="/" className="text-[13px] font-semibold text-zinc-500 transition hover:text-zinc-900 max-sm:hidden">
						← otto.dev
					</Link>
				</header>
				<main className="mx-auto max-w-3xl px-6 py-10 md:px-10">{children}</main>
			</div>
		</div>
	);
}
