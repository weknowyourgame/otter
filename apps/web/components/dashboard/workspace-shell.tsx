"use client";

import {
	ArrowLeft,
	Bell,
	BookOpen,
	Bot,
	ChevronDown,
	Code2,
	CreditCard,
	Files,
	Globe2,
	HelpCircle,
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
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { OtterGlyph } from "@/components/marks";
import { authClient } from "@/lib/auth-client";
import { Button, cx, SegmentedMeter } from "./ui";

export type WorkspaceMode =
	| "conversations"
	| "settings"
	| "agent"
	| "org"
	| "contacts"
	| "info";

const SUPPORT_EMAIL = "support@otter.so";

function gmailComposeHref(subject: string) {
	return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
		SUPPORT_EMAIL,
	)}&su=${encodeURIComponent(subject)}`;
}

type NavItem = {
	label: string;
	href: string;
	icon?: ReactNode;
	count?: string;
	aliases?: string[];
	group?: boolean;
	sub?: boolean;
	match?: "dashboard" | "agent" | "contacts" | "websites" | "settings";
};

const primaryItems: NavItem[] = [
	{
		label: "Conversations",
		href: "/dashboard",
		icon: <MessageSquareText size={16} />,
		match: "dashboard",
	},
	{ label: "Agent", href: "/agent", icon: <Bot size={16} />, match: "agent" },
	{
		label: "Contacts",
		href: "/contacts",
		icon: <Users size={16} />,
		match: "contacts",
	},
	{
		label: "Websites",
		href: "/org",
		icon: <Globe2 size={16} />,
		match: "websites",
	},
	{
		label: "Settings",
		href: "/settings",
		icon: <Settings2 size={16} />,
		match: "settings",
	},
];

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

const MESSAGES_LIMIT = 200;
const CONVERSATIONS_LIMIT = 20;

function useTenantUsage(): { requests: number; conversations: number } | null {
	const [usage, setUsage] = useState<{
		requests: number;
		conversations: number;
	} | null>(null);
	useEffect(() => {
		let active = true;
		fetch("/api/account/usage")
			.then((response) => (response.ok ? response.json() : null))
			.then(
				(
					body: {
						usage?: { requests: number; conversations: number };
					} | null,
				) => {
					if (active && body?.usage) setUsage(body.usage);
				},
			)
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);
	return usage;
}

function _UsageCard() {
	const usage = useTenantUsage();
	const requests = usage?.requests ?? 0;
	const conversations = usage?.conversations ?? 0;
	return (
		<div className="od-usage-card">
			<Link href="/settings/plan">Upgrade to Pro</Link>
			<p>Unlock more conversations, sources, and team seats.</p>
			<div className="od-usage-card__row">
				<span>Messages</span>
				<span>
					{requests} / {MESSAGES_LIMIT}
				</span>
			</div>
			<SegmentedMeter
				filled={Math.round((requests / MESSAGES_LIMIT) * 34)}
				segments={34}
			/>
			<div className="od-usage-card__row">
				<span>Conversations</span>
				<span>
					{conversations} / {CONVERSATIONS_LIMIT}
				</span>
			</div>
			<SegmentedMeter
				filled={Math.round((conversations / CONVERSATIONS_LIMIT) * 34)}
				segments={34}
			/>
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
	const secondaryItems =
		mode === "settings"
			? settingsItems
			: mode === "agent"
				? agentItems
				: mode === "org"
					? orgItems
					: [];
	const secondaryLabel =
		mode === "settings"
			? "Settings"
			: mode === "agent"
				? "Agent"
				: mode === "org"
					? "Websites"
					: "";

	function isPrimaryActive(item: NavItem) {
		switch (item.match) {
			case "dashboard":
				return pathname === "/dashboard";
			case "agent":
				return pathname.startsWith("/agent");
			case "contacts":
				return pathname.startsWith("/contacts");
			case "websites":
				return pathname.startsWith("/org") || pathname.startsWith("/websites");
			case "settings":
				return pathname.startsWith("/settings") || pathname === "/billing";
			default:
				return false;
		}
	}

	function isSecondaryActive(item: NavItem) {
		const aliases = [item.href, ...(item.aliases ?? [])];
		const exactRoot = ["/settings", "/agent", "/org"].includes(item.href);
		return (
			!item.group &&
			aliases.some((href) =>
				exactRoot ? pathname === href : pathname.startsWith(href),
			)
		);
	}

	function renderItems(
		items: NavItem[],
		activeFor: (item: NavItem) => boolean,
	) {
		return items.map((item, index) => {
			const isActive = activeFor(item);
			const beforeSub = item.sub && !items[index - 1]?.sub;
			return (
				<div
					key={`${item.href}-${item.label}`}
					className={beforeSub ? "od-nav-subgroup" : undefined}
				>
					<Link
						aria-current={isActive ? "page" : undefined}
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
		});
	}

	return (
		<div className="od-sidebar__nav">
			<nav className="od-nav-section" aria-label="App navigation">
				{renderItems(primaryItems, isPrimaryActive)}
			</nav>
			{secondaryItems.length > 0 ? (
				<div className="od-nav-section od-nav-section--secondary">
					<span className="od-nav-section__label">{secondaryLabel}</span>
					<nav aria-label={`${secondaryLabel} navigation`}>
						{renderItems(secondaryItems, isSecondaryActive)}
					</nav>
				</div>
			) : null}
		</div>
	);
}

function useTenantName(): string | null {
	const [tenantName, setTenantName] = useState<string | null>(null);
	useEffect(() => {
		let active = true;
		fetch("/api/account")
			.then((response) => (response.ok ? response.json() : null))
			.then((body: { tenantName?: string } | null) => {
				if (active && body?.tenantName) setTenantName(body.tenantName);
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);
	return tenantName;
}

function SidebarFooter() {
	const tenantName = useTenantName();
	return (
		<div className="od-sidebar__footer">
			{/* <UsageCard /> */}
			<a
				href={gmailComposeHref("Otter Help Request")}
				rel="noreferrer"
				target="_blank"
			>
				<HelpCircle size={15} /> Need help?
			</a>
			<Link href="/docs">
				<BookOpen size={15} /> Docs
			</Link>
			<Button
				className="od-sidebar-signout"
				onClick={() => void signOut()}
				variant="ghost"
			>
				<LogOut size={15} /> Sign out
			</Button>
			<Link
				aria-label={`Open ${tenantName ?? "your"} organization`}
				className="od-org-switcher"
				href="/org"
			>
				<span>{(tenantName ?? "O").slice(0, 1).toUpperCase()}</span>
				<div>
					<strong>{tenantName ?? "Loading…"}</strong>
				</div>
				<ChevronDown size={14} />
			</Link>
		</div>
	);
}

function Topbar({ mode, onMenu }: { mode: WorkspaceMode; onMenu: () => void }) {
	const router = useRouter();
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
					aria-label="Otter dashboard"
					className="od-topbar__brand"
					href="/dashboard"
				>
					<span className="od-topbar__mark">
						<OtterGlyph className="h-4 w-4" />
					</span>
					<span>Otter</span>
				</Link>
				<Button
					className="od-topbar__back"
					onClick={() => router.back()}
					variant="ghost"
				>
					<ArrowLeft size={15} />
					<span>Back</span>
				</Button>
			</div>
			<nav className="od-topbar__links" aria-label="Workspace actions">
				<a
					className="od-topbar__feedback"
					href={gmailComposeHref("Otter Feedback")}
					rel="noreferrer"
					target="_blank"
				>
					Feedback?
				</a>
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
					<SidebarFooter />
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
			<Button
				disabled={!trained}
				className="od-train-button"
				variant="secondary"
			>
				{trained ? "Train agent" : "Nothing new to train"}
			</Button>
		</div>
	);
}
