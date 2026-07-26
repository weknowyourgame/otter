"use client";

import {
	Check,
	CreditCard,
	Image as ImageIcon,
	KeyRound,
	LoaderCircle,
	Mail,
	MoreHorizontal,
	Plus,
	ShieldCheck,
	Trash2,
	UserPlus,
} from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
	Button,
	CopyButton,
	Field,
	Meter,
	Modal,
	PageTitle,
	PanelFooter,
	SelectField,
	SettingsSection,
	SettingToggle,
} from "./ui";
import { WorkspaceShell } from "./workspace-shell";

function SettingsPageFrame({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<WorkspaceShell mode="settings">
			<div className="od-settings-page">
				<PageTitle>{title}</PageTitle>
				<div className="od-settings-stack">{children}</div>
			</div>
		</WorkspaceShell>
	);
}

type Account = { name: string; email: string; role: "owner" | "member" };

function useAccount(): Account | null {
	const [account, setAccount] = useState<Account | null>(null);
	useEffect(() => {
		let active = true;
		fetch("/api/account")
			.then((response) => (response.ok ? response.json() : null))
			.then(
				(
					body: {
						user?: { name: string; email: string };
						role?: "owner" | "member";
					} | null,
				) => {
					if (active && body?.user && body.role) {
						setAccount({
							name: body.user.name,
							email: body.user.email,
							role: body.role,
						});
					}
				},
			)
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);
	return account;
}

export function GeneralSettingsPage() {
	const [saved, setSaved] = useState(false);
	const account = useAccount();
	return (
		<SettingsPageFrame title="General">
			<SettingsSection
				description="Manage the information visitors see across the widget and emails."
				title="Website information"
			>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						setSaved(true);
						window.setTimeout(() => setSaved(false), 1600);
					}}
				>
					<div className="od-form-stack">
						<Field defaultValue="Otter" label="Website name" />
						<Field
							defaultValue="support@otter.so"
							hint="Visitors can use this address to reach a human directly."
							label="Contact email (optional)"
							type="email"
						/>
						<Field
							defaultValue="otter.so"
							hint="The domain visitors use to chat with your team."
							label="Domain"
						/>
						<div className="od-field">
							<span className="od-field__label">Website logo</span>
							<button
								aria-label="Upload website logo"
								className="od-logo-upload"
								type="button"
							>
								<ImageIcon size={21} />
								<span>Upload logo</span>
								<small>PNG, JPG or SVG</small>
							</button>
						</div>
					</div>
					<PanelFooter>
						<span className="od-save-note">
							{saved ? (
								<>
									<Check size={14} /> Saved
								</>
							) : (
								"Changes only affect this website"
							)}
						</span>
						<Button type="submit" variant="primary">
							Save website information
						</Button>
					</PanelFooter>
				</form>
			</SettingsSection>
			<SettingsSection
				description="Control how your name and avatar appear to teammates and visitors."
				title="Your profile"
			>
				<div className="od-form-stack">
					<Field
						defaultValue={account?.name ?? ""}
						key={account?.name ?? "name"}
						label="Name"
					/>
					<Field
						defaultValue={account?.email ?? ""}
						key={account?.email ?? "email"}
						label="Email"
						readOnly
					/>
					<SelectField defaultValue="Asia/Kolkata" label="Timezone">
						<option>Asia/Kolkata</option>
						<option>Europe/London</option>
						<option>America/New_York</option>
					</SelectField>
				</div>
				<PanelFooter>
					<span />
					<Button variant="primary">Save profile</Button>
				</PanelFooter>
			</SettingsSection>
			<SettingsSection
				description="Set the defaults Otter uses for reports, translations, and new conversations."
				title="Organization preferences"
			>
				<div className="od-form-stack">
					<SettingToggle
						checked
						description="Send an activity and performance recap every Monday."
						onChange={() => {}}
						title="Weekly digest"
					/>
					<SettingToggle
						checked
						description="Translate visitor messages into your dashboard language."
						onChange={() => {}}
						title="Automatic translation"
					/>
				</div>
			</SettingsSection>
		</SettingsPageFrame>
	);
}

export function NotificationsSettingsPage() {
	const [values, setValues] = useState({
		messages: true,
		escalations: true,
		browser: false,
		sound: true,
		typing: false,
		marketing: false,
	});
	const toggle = (key: keyof typeof values) => (checked: boolean) =>
		setValues((current) => ({ ...current, [key]: checked }));
	return (
		<SettingsPageFrame title="Notifications">
			<SettingsSection
				description="Choose what Otter emails you about."
				title="Email"
			>
				<SettingToggle
					checked={values.messages}
					description="Receive an email when a visitor starts a conversation."
					onChange={toggle("messages")}
					title="New conversations"
				/>
				<SettingToggle
					checked={values.escalations}
					description="Know immediately when Otter hands a conversation to your team."
					onChange={toggle("escalations")}
					title="AI escalations"
				/>
				<SettingToggle
					checked={values.marketing}
					description="Occasional product news and workflow ideas from Otter."
					onChange={toggle("marketing")}
					title="Product updates"
				/>
				<PanelFooter>
					<span />
					<Button variant="primary">Save preferences</Button>
				</PanelFooter>
			</SettingsSection>
			<SettingsSection
				description="Stay in the loop while working in another tab."
				title="Browser & sound"
			>
				<SettingToggle
					checked={values.browser}
					description="Show push notifications for new visitor messages."
					onChange={toggle("browser")}
					title="Browser push notifications"
				/>
				<SettingToggle
					checked={values.sound}
					description="Play a subtle sound for a new message."
					onChange={toggle("sound")}
					title="New message sound"
				/>
				<SettingToggle
					checked={values.typing}
					description="Play a quieter cue when a visitor begins typing."
					onChange={toggle("typing")}
					title="Typing sound"
				/>
			</SettingsSection>
		</SettingsPageFrame>
	);
}

type TeamMember = {
	userId: string;
	name: string;
	email: string;
	role: "owner" | "member";
	createdAt: number;
};

type TeamInvite = {
	id: string;
	email: string;
	role: "owner" | "member";
	createdAt: number;
	expiresAt: number;
};

function useTeam() {
	const [members, setMembers] = useState<TeamMember[] | null>(null);
	const [invites, setInvites] = useState<TeamInvite[] | null>(null);

	async function refresh() {
		const response = await fetch("/api/account/team");
		if (!response.ok) return;
		const body = (await response.json()) as {
			members: TeamMember[];
			invites: TeamInvite[];
		};
		setMembers(body.members);
		setInvites(body.invites);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: refresh is redefined every render but should only run once on mount
	useEffect(() => {
		void refresh();
	}, []);

	return { members, invites, refresh };
}

export function TeamSettingsPage() {
	const account = useAccount();
	const { members, invites, refresh } = useTeam();
	const [inviteOpen, setInviteOpen] = useState(false);
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<"owner" | "member">("member");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");

	async function sendInvite(event: FormEvent) {
		event.preventDefault();
		if (!inviteEmail) return;
		setSubmitting(true);
		setError("");
		const response = await fetch("/api/account/team/invite", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
		});
		setSubmitting(false);
		if (!response.ok) {
			setError("Could not send that invitation. Try again.");
			return;
		}
		await refresh();
		setInviteEmail("");
		setInviteOpen(false);
	}

	async function removeMember(userId: string) {
		const response = await fetch(`/api/account/team/${userId}`, {
			method: "DELETE",
		});
		if (!response.ok) {
			setError("Could not remove that teammate.");
			return;
		}
		await refresh();
	}

	async function revokeInvite(id: string) {
		await fetch(`/api/account/team/invite/${id}`, { method: "DELETE" });
		await refresh();
	}

	const seatsUsed = members?.length ?? 0;

	return (
		<SettingsPageFrame title="Team">
			{error ? <div className="od-settings-error">{error}</div> : null}
			<SettingsSection
				description="Invite teammates to manage conversations, knowledge, and agent behavior."
				title="Members"
			>
				<div className="od-team-head">
					<div>
						<strong>{seatsUsed} of 3 seats used</strong>
						<p>Owners and admins can invite teammates.</p>
					</div>
					<Button onClick={() => setInviteOpen(true)} variant="primary">
						<UserPlus size={15} /> Invite teammate
					</Button>
				</div>
				<div className="od-table-wrap od-table-wrap--flush">
					<table className="od-table">
						<thead>
							<tr>
								<th>Member</th>
								<th>Role</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{(members ?? []).map((member) => (
								<tr key={member.userId}>
									<td>
										<div className="od-person">
											<span>{member.name.slice(0, 1)}</span>
											<div>
												<strong>{member.name}</strong>
												<small>{member.email}</small>
											</div>
										</div>
									</td>
									<td>
										<span className="od-badge">
											{member.role === "owner" ? "Owner" : "Member"}
										</span>
									</td>
									<td>
										<span className="od-status is-live">Active</span>
									</td>
									<td>
										{account && member.email !== account.email ? (
											<Button
												aria-label={`Remove ${member.name}`}
												onClick={() => void removeMember(member.userId)}
												size="icon"
												variant="ghost"
											>
												<MoreHorizontal size={16} />
											</Button>
										) : null}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<PanelFooter>
					<span>
						{Math.max(0, 3 - seatsUsed)} seat(s) remaining on the Free plan
					</span>
					<Link className="od-inline-link" href="/settings/plan">
						Compare plans
					</Link>
				</PanelFooter>
			</SettingsSection>
			<SettingsSection
				description="Invitations expire after seven days."
				title="Pending invitations"
			>
				{invites && invites.length > 0 ? (
					<div className="od-table-wrap od-table-wrap--flush">
						<table className="od-table">
							<thead>
								<tr>
									<th>Email</th>
									<th>Role</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{invites.map((invite) => (
									<tr key={invite.id}>
										<td>{invite.email}</td>
										<td>
											<span className="od-badge">
												{invite.role === "owner" ? "Owner" : "Member"}
											</span>
										</td>
										<td>
											<Button
												aria-label={`Revoke invitation for ${invite.email}`}
												onClick={() => void revokeInvite(invite.id)}
												size="icon"
												variant="ghost"
											>
												<Trash2 size={15} />
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="od-empty-row">
						<Mail size={18} />
						<div>
							<strong>No pending invitations</strong>
							<p>New invitations will appear here until accepted.</p>
						</div>
					</div>
				)}
			</SettingsSection>
			<Modal
				description="They will be able to access Otter immediately after accepting."
				onClose={() => setInviteOpen(false)}
				open={inviteOpen}
				title="Invite a teammate"
			>
				<form onSubmit={sendInvite}>
					<div className="od-modal__body">
						<Field
							autoFocus
							label="Work email"
							onChange={(event) => setInviteEmail(event.target.value)}
							placeholder="name@company.com"
							type="email"
							value={inviteEmail}
						/>
						<SelectField
							label="Organization role"
							onChange={(event) =>
								setInviteRole(event.target.value as "owner" | "member")
							}
							value={inviteRole}
						>
							<option value="member">Member</option>
							<option value="owner">Owner</option>
						</SelectField>
					</div>
					<div className="od-modal__footer">
						<Button onClick={() => setInviteOpen(false)} type="button">
							Cancel
						</Button>
						<Button disabled={submitting} type="submit" variant="primary">
							{submitting ? "Sending…" : "Send invitation"}
						</Button>
					</div>
				</form>
			</Modal>
		</SettingsPageFrame>
	);
}

type TenantUsage = {
	requests: number;
	totalTokens: number;
	conversations: number;
	teamMembers: number;
};

function useTenantUsage(): TenantUsage | null {
	const [usage, setUsage] = useState<TenantUsage | null>(null);
	useEffect(() => {
		let active = true;
		fetch("/api/account/usage")
			.then((response) => (response.ok ? response.json() : null))
			.then((body: { usage?: TenantUsage } | null) => {
				if (active && body?.usage) setUsage(body.usage);
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);
	return usage;
}

export function PlanSettingsPage() {
	const usage = useTenantUsage();
	return (
		<SettingsPageFrame title="Plan & Usage">
			<SettingsSection
				description="You are currently using Otter Free."
				title="Current plan"
			>
				<div className="od-plan-current">
					<div>
						<span className="od-badge">FREE</span>
						<h3>
							$0 <small>/ month</small>
						</h3>
						<p>For early products getting their support workflow online.</p>
					</div>
					<Link
						className="od-button od-button--primary od-button--md"
						href="/pricing"
					>
						Upgrade plan
					</Link>
				</div>
				<PanelFooter>
					<span>Renews automatically every 30 days</span>
					<Link className="od-inline-link" href="/billing">
						View billing
					</Link>
				</PanelFooter>
			</SettingsSection>
			<SettingsSection
				description="Rolling usage across the current 30-day window."
				title="Usage & limits"
			>
				<div className="od-usage-list">
					<Meter
						label="AI tokens"
						limit={1_000_000}
						tone="orange"
						value={usage?.totalTokens ?? 0}
					/>
					<Meter
						label="Team members"
						limit={3}
						value={usage?.teamMembers ?? 0}
					/>
					<Meter
						label="Conversations"
						limit={20}
						value={usage?.conversations ?? 0}
					/>
					<Meter label="Messages" limit={200} value={usage?.requests ?? 0} />
				</div>
			</SettingsSection>
			<SettingsSection
				description="Your data is retained for 30 days on the Free plan."
				title="Data retention"
			>
				<div className="od-retention">
					<ShieldCheck size={20} />
					<div>
						<strong>30-day conversation history</strong>
						<p>Upgrade to Pro for unlimited history and export tools.</p>
					</div>
				</div>
			</SettingsSection>
		</SettingsPageFrame>
	);
}

export function BillingPage() {
	return (
		<SettingsPageFrame title="Billing">
			<SettingsSection
				description="Manage the card and billing identity for Otter Labs."
				title="Payment method"
			>
				<div className="od-payment-method">
					<span>
						<CreditCard size={20} />
					</span>
					<div>
						<strong>Visa ending in 4242</strong>
						<p>Expires 09/29 · Default payment method</p>
					</div>
					<Button>Update card</Button>
				</div>
			</SettingsSection>
			<SettingsSection
				description="Used on future invoices and receipts."
				title="Billing details"
			>
				<div className="od-form-stack">
					<Field defaultValue="Otter Labs" label="Legal name" />
					<Field
						defaultValue="billing@otter.so"
						label="Billing email"
						type="email"
					/>
					<Field defaultValue="India" label="Country" />
				</div>
				<PanelFooter>
					<span />
					<Button variant="primary">Save billing details</Button>
				</PanelFooter>
			</SettingsSection>
			<SettingsSection
				description="Download receipts and review prior charges."
				title="Invoices"
			>
				<div className="od-table-wrap od-table-wrap--flush">
					<table className="od-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Description</th>
								<th>Amount</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Jul 1, 2026</td>
								<td>Otter Pro</td>
								<td>$29.00</td>
								<td>
									<span className="od-status is-live">Paid</span>
								</td>
								<td>
									<Button size="sm">Download</Button>
								</td>
							</tr>
							<tr>
								<td>Jun 1, 2026</td>
								<td>Otter Pro</td>
								<td>$29.00</td>
								<td>
									<span className="od-status is-live">Paid</span>
								</td>
								<td>
									<Button size="sm">Download</Button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</SettingsSection>
		</SettingsPageFrame>
	);
}

type ApiKey = {
	id: string;
	name: string;
	type: "public" | "secret";
	mode: "test" | "live";
	maskedKey: string;
	createdAt: number;
	lastUsedAt: number | null;
};

type CreatedApiKey = ApiKey & { rawKey: string };
type OriginField = { id: string; value: string };

function keyTypeLabel(key: ApiKey): string {
	return `${key.mode === "test" ? "Test" : "Live"} ${key.type === "public" ? "Public" : "Secret"} Key`;
}

function formatCreatedAt(timestamp: number): string {
	return `Created ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(timestamp)}`;
}

async function readApiError(response: Response): Promise<string> {
	const body = (await response.json().catch(() => null)) as {
		error?: string;
	} | null;
	return (
		body?.error?.replaceAll("_", " ") || `Request failed (${response.status})`
	);
}

export function DevelopersSettingsPage() {
	const [keys, setKeys] = useState<ApiKey[]>([]);
	const [origins, setOrigins] = useState<OriginField[]>([]);
	const [loading, setLoading] = useState(true);
	const [savingOrigins, setSavingOrigins] = useState(false);
	const [submittingKey, setSubmittingKey] = useState(false);
	const [error, setError] = useState("");
	const [keyOpen, setKeyOpen] = useState(false);
	const [newKeyName, setNewKeyName] = useState("");
	const [newKeyKind, setNewKeyKind] = useState("public:test");
	const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);

	useEffect(() => {
		let active = true;
		void Promise.all([
			fetch("/api/account/keys"),
			fetch("/api/account/origins"),
		])
			.then(async ([keysResponse, originsResponse]) => {
				if (!keysResponse.ok) throw new Error(await readApiError(keysResponse));
				if (!originsResponse.ok)
					throw new Error(await readApiError(originsResponse));
				const keysBody = (await keysResponse.json()) as { keys: ApiKey[] };
				const originsBody = (await originsResponse.json()) as {
					origins: string[];
				};
				if (!active) return;
				setKeys(keysBody.keys);
				setOrigins(
					originsBody.origins.length > 0
						? originsBody.origins.map((value) => ({
								id: crypto.randomUUID(),
								value,
							}))
						: [{ id: crypto.randomUUID(), value: window.location.origin }],
				);
			})
			.catch((loadError: unknown) => {
				if (active)
					setError(
						loadError instanceof Error
							? loadError.message
							: "Could not load developer settings",
					);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, []);

	async function revokeKey(id: string) {
		setError("");
		const response = await fetch(`/api/account/keys/${id}`, {
			method: "DELETE",
		});
		if (!response.ok) {
			setError(await readApiError(response));
			return;
		}
		setKeys((current) => current.filter((key) => key.id !== id));
	}

	async function saveOrigins() {
		setSavingOrigins(true);
		setError("");
		const response = await fetch("/api/account/origins", {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				origins: origins.map((origin) => origin.value.trim()).filter(Boolean),
			}),
		});
		setSavingOrigins(false);
		if (!response.ok) {
			setError(await readApiError(response));
			return;
		}
		const body = (await response.json()) as { origins: string[] };
		setOrigins(
			body.origins.map((value) => ({ id: crypto.randomUUID(), value })),
		);
	}

	async function submitKey(event: FormEvent) {
		event.preventDefault();
		if (!newKeyName.trim()) return;
		setSubmittingKey(true);
		setError("");
		const [type, mode] = newKeyKind.split(":") as [
			ApiKey["type"],
			ApiKey["mode"],
		];
		const response = await fetch("/api/account/keys", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: newKeyName.trim(), type, mode }),
		});
		setSubmittingKey(false);
		if (!response.ok) {
			setError(await readApiError(response));
			return;
		}
		const body = (await response.json()) as { key: CreatedApiKey };
		setKeys((current) => [...current, body.key]);
		setCreatedKey(body.key);
		setNewKeyName("");
		setKeyOpen(false);
	}

	return (
		<SettingsPageFrame title="Developers">
			{error ? <div className="od-settings-error">{error}</div> : null}
			<SettingsSection
				description="Create, review, and revoke API keys connected to this website."
				title="Public and private API keys"
			>
				<div className="od-table-wrap od-table-wrap--flush">
					<table className="od-table od-api-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Type</th>
								<th>Linked teammate</th>
								<th>Key</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td className="od-table-message" colSpan={5}>
										<LoaderCircle className="od-auth-spinner" size={15} />{" "}
										Loading keys
									</td>
								</tr>
							) : null}
							{!loading && keys.length === 0 ? (
								<tr>
									<td className="od-table-message" colSpan={5}>
										No keys yet. Create a public key for your first embed.
									</td>
								</tr>
							) : null}
							{keys.map((apiKey) => (
								<tr key={apiKey.id}>
									<td>
										<strong>{apiKey.name}</strong>
										<small>{formatCreatedAt(apiKey.createdAt)}</small>
									</td>
									<td>
										<span className="od-badge">{keyTypeLabel(apiKey)}</span>
									</td>
									<td>—</td>
									<td>
										<span className="od-key-cell">{apiKey.maskedKey}</span>
									</td>
									<td>
										<Button
											onClick={() => void revokeKey(apiKey.id)}
											size="sm"
											variant="danger"
										>
											Revoke
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<PanelFooter>
					<Button onClick={() => setKeyOpen(true)} variant="primary">
						<Plus size={15} /> New API key
					</Button>
					<span>{keys.length} active keys</span>
				</PanelFooter>
			</SettingsSection>
			<SettingsSection
				description="Only these exact origins can use public keys. Include the protocol and port for local development."
				title="Allowed domains"
			>
				{origins.map((origin) => (
					<div className="od-domain-row" key={origin.id}>
						<Globe2Icon />
						<Field
							aria-label="Allowed origin"
							label="Origin"
							onChange={(event) =>
								setOrigins((current) =>
									current.map((item) =>
										item.id === origin.id
											? { ...item, value: event.target.value }
											: item,
									),
								)
							}
							placeholder="https://app.example.com"
							value={origin.value}
						/>
						<Button
							aria-label="Remove origin"
							onClick={() =>
								setOrigins((current) =>
									current.filter((item) => item.id !== origin.id),
								)
							}
							size="icon"
							variant="ghost"
						>
							<Trash2 size={15} />
						</Button>
					</div>
				))}
				<PanelFooter>
					<Button
						onClick={() =>
							setOrigins((current) => [
								...current,
								{ id: crypto.randomUUID(), value: "" },
							])
						}
					>
						<Plus size={15} /> Add domain
					</Button>
					<Button
						disabled={savingOrigins}
						onClick={() => void saveOrigins()}
						variant="primary"
					>
						{savingOrigins ? (
							<LoaderCircle className="od-auth-spinner" size={14} />
						) : null}
						Save domains
					</Button>
				</PanelFooter>
			</SettingsSection>
			<Modal
				description="Use separate keys for development, preview, and production environments."
				onClose={() => setKeyOpen(false)}
				open={keyOpen}
				title="Create API key"
			>
				<form onSubmit={submitKey}>
					<div className="od-modal__body">
						<Field
							autoFocus
							label="Key name"
							onChange={(event) => setNewKeyName(event.target.value)}
							placeholder="Preview deployment"
							value={newKeyName}
						/>
						<SelectField
							label="Key type"
							onChange={(event) => setNewKeyKind(event.target.value)}
							value={newKeyKind}
						>
							<option value="public:test">Test Public Key</option>
							<option value="public:live">Live Public Key</option>
							<option value="secret:test">Test Secret Key</option>
							<option value="secret:live">Live Secret Key</option>
						</SelectField>
						<div className="od-callout">
							<KeyRound size={16} />
							<p>
								The full key is shown once after creation. Store private keys on
								the server.
							</p>
						</div>
					</div>
					<div className="od-modal__footer">
						<Button onClick={() => setKeyOpen(false)} type="button">
							Cancel
						</Button>
						<Button disabled={submittingKey} type="submit" variant="primary">
							{submittingKey ? (
								<LoaderCircle className="od-auth-spinner" size={14} />
							) : null}
							Create key
						</Button>
					</div>
				</form>
			</Modal>
			<Modal
				description="This is the only time Otter will return the complete key."
				onClose={() => setCreatedKey(null)}
				open={Boolean(createdKey)}
				title="Your API key is ready"
			>
				<div className="od-modal__body">
					<div className="od-created-key">
						<code>{createdKey?.rawKey}</code>
						{createdKey ? (
							<CopyButton label="Copy API key" value={createdKey.rawKey} />
						) : null}
					</div>
					<div className="od-callout">
						<KeyRound size={16} />
						<p>
							Add public keys to the Otter embed. Keep secret keys on trusted
							servers only.
						</p>
					</div>
				</div>
				<div className="od-modal__footer">
					<Button onClick={() => setCreatedKey(null)} variant="primary">
						Done
					</Button>
				</div>
			</Modal>
		</SettingsPageFrame>
	);
}

function Globe2Icon() {
	return <span className="od-domain-icon">www</span>;
}
