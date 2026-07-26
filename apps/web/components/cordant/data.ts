// Seed data + types for the Cordant demo console. Deliberately dense and a
// little repetitive — the point is a workspace an agent has to actually
// read carefully, not one it can pattern-match in one glance.

export type TicketStatus = "New" | "Open" | "Pending" | "On Hold" | "Resolved" | "Closed";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

export interface Comment {
	author: string;
	at: string;
	text: string;
	internal?: boolean;
}

export interface Ticket {
	id: string;
	subject: string;
	requester: string;
	assignee: string | null;
	status: TicketStatus;
	priority: TicketPriority;
	projectId: string;
	labels: string[];
	createdAt: string;
	updatedAt: string;
	description: string;
	comments: Comment[];
}

export interface Project {
	id: string;
	key: string;
	name: string;
	lead: string;
	description: string;
}

export type UserRole = "Owner" | "Admin" | "Manager" | "Agent" | "Viewer";
export type UserStatus = "Active" | "Invited" | "Suspended";

export interface OrgUser {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	status: UserStatus;
	title: string;
}

export const STATUS_WORKFLOW: Record<TicketStatus, TicketStatus[]> = {
	New: ["Open", "Closed"],
	Open: ["Pending", "On Hold", "Resolved"],
	Pending: ["Open", "On Hold", "Resolved"],
	"On Hold": ["Open", "Pending"],
	Resolved: ["Closed", "Open"],
	Closed: ["Open"],
};

export const AGENT_NAMES = [
	"Priya Shah",
	"Marcus Webb",
	"Elena Kowalski",
	"Devon Ito",
	"Grace Nakamura",
];

export const PROJECTS: Project[] = [
	{
		id: "proj-core",
		key: "COR",
		name: "Core Platform",
		lead: "Priya Shah",
		description: "The main product surface — auth, billing, workspace settings.",
	},
	{
		id: "proj-mob",
		key: "MOB",
		name: "Mobile Apps",
		lead: "Devon Ito",
		description: "iOS and Android client applications.",
	},
	{
		id: "proj-data",
		key: "DAT",
		name: "Data Pipeline",
		lead: "Elena Kowalski",
		description: "Ingestion, ETL, and the reporting warehouse.",
	},
	{
		id: "proj-apollo",
		key: "APL",
		name: "Apollo Launch",
		lead: "Marcus Webb",
		description: "Enterprise rollout workspace for the Apollo customer launch.",
	},
];

export const DEFAULT_TICKETS: Ticket[] = [
	{
		id: "COR-1042",
		subject: "Customer cannot enable two-factor authentication",
		requester: "jordan.lee@acme.io",
		assignee: "Priya Shah",
		status: "Open",
		priority: "High",
		projectId: "proj-core",
		labels: ["auth", "customer-reported"],
		createdAt: "2026-07-08T14:22:00Z",
		updatedAt: "2026-07-12T09:10:00Z",
		description:
			"Customer reports the QR code on the security settings page never loads. Confirmed on Chrome and Safari. Needs a fix or a workaround before their compliance audit on the 20th.",
		comments: [
			{ author: "Marcus Webb", at: "2026-07-09T10:00:00Z", text: "Repro'd on staging. Looks like the TOTP secret endpoint is timing out under load." },
			{ author: "Priya Shah", at: "2026-07-10T16:40:00Z", text: "Escalating to High — customer has a hard deadline.", internal: true },
		],
	},
	{
		id: "COR-1039",
		subject: "Billing page shows stale invoice totals after plan change",
		requester: "finance@umbra.co",
		assignee: "Marcus Webb",
		status: "Pending",
		priority: "Medium",
		projectId: "proj-core",
		labels: ["billing"],
		createdAt: "2026-07-05T11:05:00Z",
		updatedAt: "2026-07-11T08:30:00Z",
		description: "Upgraded from Starter to Growth mid-cycle; invoice total on the billing page didn't refresh until a hard reload.",
		comments: [{ author: "Marcus Webb", at: "2026-07-06T09:15:00Z", text: "Waiting on a cache-busting fix from the billing service team." }],
	},
	{
		id: "MOB-311",
		subject: "Push notifications not delivered on Android 15",
		requester: "beta@northline.dev",
		assignee: "Devon Ito",
		status: "New",
		priority: "Urgent",
		projectId: "proj-mob",
		labels: ["android", "notifications", "regression"],
		createdAt: "2026-07-13T07:40:00Z",
		updatedAt: "2026-07-13T07:40:00Z",
		description: "Multiple beta testers on Android 15 report zero push notifications since the 4.8.0 build. Likely related to the new notification channel API.",
		comments: [],
	},
	{
		id: "DAT-88",
		subject: "Nightly ETL job silently drops rows with null region",
		requester: "internal — data team",
		assignee: null,
		status: "Open",
		priority: "Medium",
		projectId: "proj-data",
		labels: ["etl", "data-quality"],
		createdAt: "2026-07-10T02:15:00Z",
		updatedAt: "2026-07-10T02:15:00Z",
		description: "Row count in the warehouse is ~2% lower than source for the last 4 nights. Suspect the region-normalization step is filtering nulls instead of bucketing them as 'unknown'.",
		comments: [],
	},
	{
		id: "COR-1044",
		subject: "Request: allow custom roles beyond the 5 built-in ones",
		requester: "ops@vantage-labs.com",
		assignee: null,
		status: "New",
		priority: "Low",
		projectId: "proj-core",
		labels: ["feature-request", "permissions"],
		createdAt: "2026-07-12T19:00:00Z",
		updatedAt: "2026-07-12T19:00:00Z",
		description: "Enterprise customer wants a role between Manager and Agent with view-only billing access.",
		comments: [],
	},
	{
		id: "COR-1031",
		subject: "SSO login loop for @acme.io domain",
		requester: "it@acme.io",
		assignee: "Priya Shah",
		status: "On Hold",
		priority: "High",
		projectId: "proj-core",
		labels: ["sso", "auth"],
		createdAt: "2026-06-28T13:00:00Z",
		updatedAt: "2026-07-09T12:00:00Z",
		description: "Users get redirected back to the SSO provider immediately after a successful login. On hold pending the customer's IdP metadata refresh.",
		comments: [{ author: "Priya Shah", at: "2026-07-01T10:00:00Z", text: "Blocked on customer providing updated SAML metadata XML." }],
	},
	{
		id: "MOB-298",
		subject: "Crash on cold start for users with 50+ saved views",
		requester: "support (internal)",
		assignee: "Devon Ito",
		status: "Resolved",
		priority: "Medium",
		projectId: "proj-mob",
		labels: ["crash", "performance"],
		createdAt: "2026-06-20T09:00:00Z",
		updatedAt: "2026-07-02T15:00:00Z",
		description: "Fixed in 4.7.2 — saved views are now paginated on load instead of deserialized all at once.",
		comments: [{ author: "Devon Ito", at: "2026-07-02T15:00:00Z", text: "Shipped in 4.7.2, closing after one more week of crash-free telemetry." }],
	},
	{
		id: "DAT-81",
		subject: "Add data retention policy for deleted workspaces",
		requester: "legal@internal",
		assignee: "Elena Kowalski",
		status: "Closed",
		priority: "Low",
		projectId: "proj-data",
		labels: ["compliance"],
		createdAt: "2026-05-14T10:00:00Z",
		updatedAt: "2026-06-01T10:00:00Z",
		description: "30-day soft-delete retention implemented and documented.",
		comments: [],
	},
];

export const DEFAULT_USERS: OrgUser[] = [
	{ id: "u-1", name: "Demo User", email: "demo@cordant.io", role: "Owner", status: "Active", title: "Head of Support Ops" },
	{ id: "u-2", name: "Priya Shah", email: "priya@cordant.io", role: "Admin", status: "Active", title: "Engineering Lead, Core" },
	{ id: "u-3", name: "Marcus Webb", email: "marcus@cordant.io", role: "Agent", status: "Active", title: "Support Engineer" },
	{ id: "u-4", name: "Elena Kowalski", email: "elena@cordant.io", role: "Manager", status: "Active", title: "Data Platform Lead" },
	{ id: "u-5", name: "Devon Ito", email: "devon@cordant.io", role: "Agent", status: "Active", title: "Mobile Engineer" },
	{ id: "u-6", name: "Grace Nakamura", email: "grace@cordant.io", role: "Viewer", status: "Invited", title: "Finance (Read-only)" },
];

export const PERMISSION_GROUPS: Array<{ group: string; permissions: Array<{ key: string; label: string }> }> = [
	{
		group: "Tickets",
		permissions: [
			{ key: "tickets.view", label: "View tickets" },
			{ key: "tickets.edit", label: "Edit tickets" },
			{ key: "tickets.reassign", label: "Reassign tickets" },
			{ key: "tickets.delete", label: "Delete tickets" },
		],
	},
	{
		group: "Projects",
		permissions: [
			{ key: "projects.view", label: "View projects" },
			{ key: "projects.edit", label: "Edit project settings" },
			{ key: "projects.delete", label: "Delete projects" },
		],
	},
	{
		group: "Automation",
		permissions: [
			{ key: "automation.view", label: "View automation rules" },
			{ key: "automation.edit", label: "Create and edit rules" },
			{ key: "automation.delete", label: "Delete rules" },
		],
	},
	{
		group: "Billing",
		permissions: [
			{ key: "billing.view", label: "View billing and invoices" },
			{ key: "billing.edit", label: "Change plan and payment method" },
		],
	},
	{
		group: "Users & Roles",
		permissions: [
			{ key: "users.view", label: "View users" },
			{ key: "users.invite", label: "Invite users" },
			{ key: "users.roles", label: "Change user roles" },
			{ key: "users.remove", label: "Remove users" },
		],
	},
];

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
	Owner: allTrue(),
	Admin: allTrue({ "users.remove": true, "billing.edit": false }),
	Manager: {
		"tickets.view": true, "tickets.edit": true, "tickets.reassign": true, "tickets.delete": false,
		"projects.view": true, "projects.edit": true, "projects.delete": false,
		"automation.view": true, "automation.edit": true, "automation.delete": false,
		"billing.view": true, "billing.edit": false,
		"users.view": true, "users.invite": true, "users.roles": false, "users.remove": false,
	},
	Agent: {
		"tickets.view": true, "tickets.edit": true, "tickets.reassign": false, "tickets.delete": false,
		"projects.view": true, "projects.edit": false, "projects.delete": false,
		"automation.view": true, "automation.edit": false, "automation.delete": false,
		"billing.view": false, "billing.edit": false,
		"users.view": true, "users.invite": false, "users.roles": false, "users.remove": false,
	},
	Viewer: {
		"tickets.view": true, "tickets.edit": false, "tickets.reassign": false, "tickets.delete": false,
		"projects.view": true, "projects.edit": false, "projects.delete": false,
		"automation.view": true, "automation.edit": false, "automation.delete": false,
		"billing.view": true, "billing.edit": false,
		"users.view": true, "users.invite": false, "users.roles": false, "users.remove": false,
	},
};

function allTrue(overrides: Record<string, boolean> = {}): Record<string, boolean> {
	const out: Record<string, boolean> = {};
	for (const g of [
		"tickets.view", "tickets.edit", "tickets.reassign", "tickets.delete",
		"projects.view", "projects.edit", "projects.delete",
		"automation.view", "automation.edit", "automation.delete",
		"billing.view", "billing.edit",
		"users.view", "users.invite", "users.roles", "users.remove",
	]) out[g] = true;
	return { ...out, ...overrides };
}

export const DEFAULT_ROLE_PERMISSION_MAP = DEFAULT_ROLE_PERMISSIONS;

export type TriggerType = "Ticket created" | "Ticket updated" | "Ticket status changed" | "SLA breached" | "Comment added";
export type ConditionField = "Priority" | "Project" | "Status" | "Label" | "Requester domain";
export type ActionType = "Assign to agent" | "Set priority" | "Add label" | "Post internal comment" | "Send email to requester" | "Change status";

export interface RuleCondition {
	field: ConditionField;
	value: string;
}
export interface RuleAction {
	type: ActionType;
	value: string;
}
export interface AutomationRule {
	id: string;
	name: string;
	trigger: TriggerType;
	conditions: RuleCondition[];
	actions: RuleAction[];
	enabled: boolean;
}

export const DEFAULT_RULES: AutomationRule[] = [
	{
		id: "rule-1",
		name: "Auto-escalate urgent mobile bugs",
		trigger: "Ticket created",
		conditions: [
			{ field: "Priority", value: "Urgent" },
			{ field: "Project", value: "Mobile Apps" },
		],
		actions: [
			{ type: "Assign to agent", value: "Devon Ito" },
			{ type: "Post internal comment", value: "Auto-assigned by escalation rule." },
		],
		enabled: true,
	},
	{
		id: "rule-2",
		name: "Notify requester on resolution",
		trigger: "Ticket status changed",
		conditions: [{ field: "Status", value: "Resolved" }],
		actions: [{ type: "Send email to requester", value: "Your ticket has been resolved." }],
		enabled: true,
	},
	{
		id: "rule-3",
		name: "Tag SSO-related tickets",
		trigger: "Ticket created",
		conditions: [{ field: "Label", value: "sso" }],
		actions: [{ type: "Add label", value: "needs-security-review" }],
		enabled: false,
	},
];

export interface Webhook {
	id: string;
	url: string;
	event: string;
	active: boolean;
}

export const DEFAULT_WEBHOOKS: Webhook[] = [
	{ id: "wh-1", url: "https://hooks.acme-internal.com/cordant/tickets", event: "ticket.updated", active: true },
];

export function statusTone(s: TicketStatus): "blue" | "amber" | "violet" | "zinc" | "green" {
	if (s === "New") return "blue";
	if (s === "Open") return "amber";
	if (s === "Pending") return "violet";
	if (s === "On Hold") return "zinc";
	if (s === "Resolved") return "green";
	return "zinc";
}
export function priorityTone(p: TicketPriority): "zinc" | "amber" | "red" {
	if (p === "Urgent") return "red";
	if (p === "High") return "amber";
	return "zinc";
}

export function relTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.round(diff / 60000);
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.round(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.round(hrs / 24)}d ago`;
}

export function initials(name: string): string {
	return name
		.split(" ")
		.map((p) => p[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}
