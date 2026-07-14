"use client";

import {
	Archive,
	Bell,
	BookOpen,
	Bot,
	ChevronDown,
	Code2,
	CreditCard,
	Files,
	Globe2,
	HelpCircle,
	Inbox,
	LogOut,
	Menu,
	MessageSquareText,
	PanelLeftClose,
	Settings2,
	SlidersHorizontal,
	Sparkles,
	Users,
	WalletCards,
	WandSparkles,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { OttoGlyph } from "@/components/marks";
import { authClient } from "@/lib/auth-client";
import { Button, cx, SegmentedMeter } from "./ui";

export type WorkspaceMode = "inbox" | "settings" | "agent" | "org";

type NavItem = {
	label: string;
	href: string;
	icon?: ReactNode;
	count?: string;
	aliases?: string[];
	group?: boolean;
	sub?: boolean;
};

const settingsItems: NavItem[] = [
	{
		label: "General",
		href: "/settings",
		icon: <SlidersHorizontal size={16} />,
	},
	{
		label: "Notifications",
		href: "/settings/notifications",
		icon: <Bell size={16} />,
	},
	{ label: "Team", href: "/settings/team", icon: <Users size={16} /> },
	{
		label: "Plan & Usage",
		href: "/settings/plan",
		icon: <WalletCards size={16} />,
	},
	{
		label: "Developers",
		href: "/settings/developers",
		icon: <Code2 size={16} />,
	},
	{ label: "Billing", href: "/billing", icon: <CreditCard size={16} /> },
];

const agentItems: NavItem[] = [
	{ label: "General", href: "/agent", icon: <SlidersHorizontal size={16} /> },
	{
		label: "Behaviour",
		href: "/agent/behaviour",
		aliases: ["/agent/behavior"],
		icon: <WandSparkles size={16} />,
	},
	{ label: "Tools & Skills", href: "/agent/tools", icon: <Bot size={16} /> },
	{
		label: "Knowledge",
		href: "/agent/knowledge/web-sources",
		icon: <BookOpen size={16} />,
		group: true,
	},
	{
		label: "Web Sources",
		href: "/agent/knowledge/web-sources",
		icon: <Globe2 size={14} />,
		sub: true,
	},
	{
		label: "FAQ",
		href: "/agent/knowledge/faq",
		icon: <MessageSquareText size={14} />,
		sub: true,
	},
	{
		label: "Files",
		href: "/agent/knowledge/files",
		icon: <Files size={14} />,
		sub: true,
	},
];

const inboxItems: NavItem[] = [
	{ label: "Inbox", href: "/dashboard", count: "0", icon: <Inbox size={16} /> },
	{
		label: "Resolved",
		href: "/dashboard/resolved",
		icon: <Sparkles size={16} />,
	},
	{
		label: "Spam",
		href: "/dashboard/spam",
		icon: <MessageSquareText size={16} />,
	},
	{
		label: "Archived",
		href: "/dashboard/archived",
		icon: <Archive size={16} />,
	},
];

const orgItems: NavItem[] = [
	{ label: "Workspace", href: "/org", icon: <Globe2 size={16} /> },
	{
		label: "Create website",
		href: "/websites/create",
		icon: <Sparkles size={16} />,
	},
	{
		label: "New organization",
		href: "/organizations/create",
		icon: <Users size={16} />,
	},
];

function UsageCard() {
	return (
		<div className="od-usage-card">
			<Link href="/settings/plan">Upgrade to Pro</Link>
			<p>Unlock more conversations, sources, and team seats.</p>
			<div className="od-usage-card__row">
				<span>Messages</span>
				<span>42 / 200</span>
			</div>
			<SegmentedMeter filled={9} segments={34} />
			<div className="od-usage-card__row">
				<span>Conversations</span>
				<span>6 / 20</span>
			</div>
			<SegmentedMeter filled={10} segments={34} />
			<small>Rolling 30-day window</small>
		</div>
	);
}

async function signOut(): Promise<void> {
	await authClient.signOut();
	window.location.assign("/login");
}

function SidebarNav({ mode }: { mode: WorkspaceMode }) {
	const pathname = usePathname();
	const items =
		mode === "settings"
			? settingsItems
			: mode === "agent"
				? agentItems
				: mode === "org"
					? orgItems
					: inboxItems;
	return (
		<nav className="od-sidebar__nav" aria-label={`${mode} navigation`}>
			{items.map((item, index) => {
				const aliases = [item.href, ...(item.aliases ?? [])];
				const exactRoot = [
					"/settings",
					"/agent",
					"/org",
					"/dashboard",
				].includes(item.href);
				const isActive =
					!item.group &&
					aliases.some((href) =>
						exactRoot ? pathname === href : pathname.startsWith(href),
					);
				const beforeSub = item.sub && !items[index - 1]?.sub;
				return (
					<div
						key={`${item.href}-${item.label}`}
						className={beforeSub ? "od-nav-subgroup" : undefined}
					>
						<Link
							className={cx(
								"od-nav-item",
								item.sub && "is-sub",
								isActive && "is-active",
							)}
							href={item.href}
						>
							<span className="od-nav-item__icon">{item.icon}</span>
							<span>{item.label}</span>
							{item.count ? (
								<span className="od-nav-item__count">{item.count}</span>
							) : null}
						</Link>
					</div>
				);
			})}
		</nav>
	);
}

function SidebarFooter({ mode }: { mode: WorkspaceMode }) {
	return (
		<div className="od-sidebar__footer">
			<UsageCard />
			<Link href="/docs">
				<HelpCircle size={15} /> Need help?
			</Link>
			<Link href="/docs">
				<BookOpen size={15} /> Docs
			</Link>
			{mode !== "settings" ? (
				<Link href="/settings">
					<Settings2 size={15} /> Settings
				</Link>
			) : null}
			<Button
				className="od-sidebar-signout"
				onClick={() => void signOut()}
				variant="ghost"
			>
				<LogOut size={15} /> Sign out
			</Button>
			<div className="od-org-switcher">
				<span>O</span>
				<div>
					<strong>Otto Labs</strong>
					<small>otto.so</small>
				</div>
				<ChevronDown size={14} />
			</div>
		</div>
	);
}

function Topbar({ mode, onMenu }: { mode: WorkspaceMode; onMenu: () => void }) {
	return (
		<header className="od-topbar">
			<div className="od-topbar__left">
				<Button
					aria-label="Open navigation"
					className="od-mobile-menu"
					onClick={onMenu}
					size="icon"
					variant="ghost"
				>
					<Menu size={18} />
				</Button>
				<Link
					aria-label="Otto dashboard"
					className="od-topbar__mark"
					href="/dashboard"
				>
					<OttoGlyph className="h-4 w-4" />
				</Link>
				<span className="od-version">v0.4.0</span>
				<Link className="od-topbar__release" href="/changelog">
					Agent memory and website training <X size={13} />
				</Link>
			</div>
			<nav className="od-topbar__links" aria-label="Workspace areas">
				<Link className={mode === "agent" ? "is-active" : ""} href="/agent">
					Agent
				</Link>
				<Link href="/contacts">Contacts</Link>
				<Link className={mode === "org" ? "is-active" : ""} href="/org">
					Websites
				</Link>
				<Link
					aria-label="Settings"
					className={cx(
						"od-topbar__settings",
						mode === "settings" && "is-active",
					)}
					href="/settings"
					title="Settings"
				>
					<Settings2 size={16} />
				</Link>
				<button type="button">Feedback?</button>
				<Button
					aria-label="Sign out"
					onClick={() => void signOut()}
					size="icon"
					title="Sign out"
					variant="ghost"
				>
					<LogOut size={15} />
				</Button>
			</nav>
		</header>
	);
}

export function WorkspaceShell({
	mode,
	children,
	rightRail,
}: {
	mode: WorkspaceMode;
	children: ReactNode;
	rightRail?: ReactNode;
}) {
	const [mobileNav, setMobileNav] = useState(false);
	return (
		<div className="od-app">
			<Topbar mode={mode} onMenu={() => setMobileNav(true)} />
			<div className="od-workspace">
				{mobileNav ? (
					<button
						aria-label="Close navigation"
						className="od-mobile-scrim"
						onClick={() => setMobileNav(false)}
						type="button"
					/>
				) : null}
				<aside className={cx("od-sidebar", mobileNav && "is-open")}>
					<div className="od-sidebar__mobile-head">
						<span>Navigation</span>
						<Button
							aria-label="Close navigation"
							onClick={() => setMobileNav(false)}
							size="icon"
							variant="ghost"
						>
							<PanelLeftClose size={17} />
						</Button>
					</div>
					<SidebarNav mode={mode} />
					<SidebarFooter mode={mode} />
				</aside>
				<main className={cx("od-main", Boolean(rightRail) && "has-right-rail")}>
					{children}
				</main>
				{rightRail ? (
					<aside className="od-right-rail">{rightRail}</aside>
				) : null}
			</div>
		</div>
	);
}

export function TrainingSummary({
	pages = 3,
	faqs = 0,
	files = 0,
	trained = false,
}: {
	pages?: number;
	faqs?: number;
	files?: number;
	trained?: boolean;
}) {
	return (
		<div className="od-training-summary">
			<h2>Sources</h2>
			<div>
				<Globe2 size={15} />
				<span>Pages</span>
				<strong>{pages} / 25</strong>
			</div>
			<div>
				<MessageSquareText size={15} />
				<span>FAQs</span>
				<strong>{faqs}</strong>
			</div>
			<div>
				<Files size={15} />
				<span>Files</span>
				<strong>{files}</strong>
			</div>
			<hr />
			<div className="od-training-summary__size">
				<span>Total size</span>
				<strong>1 KB / 1 MB</strong>
			</div>
			<SegmentedMeter filled={2} segments={28} />
			<Button
				disabled={!trained}
				className="od-train-button"
				variant="secondary"
			>
				{trained ? "Train agent" : "Nothing new to train"}
			</Button>
			<small>Last trained 4 minutes ago</small>
		</div>
	);
}
