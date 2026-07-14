"use client";

import {
	Check,
	CreditCard,
	Image as ImageIcon,
	KeyRound,
	Mail,
	MoreHorizontal,
	Plus,
	ShieldCheck,
	Trash2,
	UserPlus,
} from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
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
	Toggle,
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

export function GeneralSettingsPage() {
	const [saved, setSaved] = useState(false);
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
						<Field defaultValue="Otto" label="Website name" />
						<Field
							defaultValue="support@otto.so"
							hint="Visitors can use this address to reach a human directly."
							label="Contact email (optional)"
							type="email"
						/>
						<Field
							defaultValue="otto.so"
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
					<Field defaultValue="Sarthak Kapila" label="Name" />
					<Field defaultValue="sarthak@otto.so" label="Email" readOnly />
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
				description="Set the defaults Otto uses for reports, translations, and new conversations."
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
				description="Choose what Otto emails you about."
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
					description="Know immediately when Otto hands a conversation to your team."
					onChange={toggle("escalations")}
					title="AI escalations"
				/>
				<SettingToggle
					checked={values.marketing}
					description="Occasional product news and workflow ideas from Otto."
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

const initialMembers = [
	{
		name: "Sarthak Kapila",
		email: "sarthak@otto.so",
		role: "Owner",
		status: "Active",
	},
	{ name: "Maya Chen", email: "maya@otto.so", role: "Admin", status: "Active" },
];

export function TeamSettingsPage() {
	const [members, setMembers] = useState(initialMembers);
	const [inviteOpen, setInviteOpen] = useState(false);
	const [inviteEmail, setInviteEmail] = useState("");
	return (
		<SettingsPageFrame title="Team">
			<SettingsSection
				description="Invite teammates to manage conversations, knowledge, and agent behavior."
				title="Members"
			>
				<div className="od-team-head">
					<div>
						<strong>{members.length} of 3 seats used</strong>
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
							{members.map((member) => (
								<tr key={member.email}>
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
										<span className="od-badge">{member.role}</span>
									</td>
									<td>
										<span className="od-status is-live">{member.status}</span>
									</td>
									<td>
										<Button
											aria-label={`More actions for ${member.name}`}
											size="icon"
											variant="ghost"
										>
											<MoreHorizontal size={16} />
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<PanelFooter>
					<span>1 seat remaining on the Free plan</span>
					<Link className="od-inline-link" href="/settings/plan">
						Compare plans
					</Link>
				</PanelFooter>
			</SettingsSection>
			<SettingsSection
				description="Invitations expire after seven days."
				title="Pending invitations"
			>
				<div className="od-empty-row">
					<Mail size={18} />
					<div>
						<strong>No pending invitations</strong>
						<p>New invitations will appear here until accepted.</p>
					</div>
				</div>
			</SettingsSection>
			<Modal
				description="They will be able to access Otto immediately after accepting."
				onClose={() => setInviteOpen(false)}
				open={inviteOpen}
				title="Invite a teammate"
			>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						if (!inviteEmail) return;
						setMembers((current) => [
							...current,
							{
								name: inviteEmail.split("@")[0] || "Teammate",
								email: inviteEmail,
								role: "Member",
								status: "Invited",
							},
						]);
						setInviteEmail("");
						setInviteOpen(false);
					}}
				>
					<div className="od-modal__body">
						<Field
							autoFocus
							label="Work email"
							onChange={(event) => setInviteEmail(event.target.value)}
							placeholder="name@company.com"
							type="email"
							value={inviteEmail}
						/>
						<SelectField defaultValue="Member" label="Organization role">
							<option>Member</option>
							<option>Admin</option>
						</SelectField>
					</div>
					<div className="od-modal__footer">
						<Button onClick={() => setInviteOpen(false)} type="button">
							Cancel
						</Button>
						<Button type="submit" variant="primary">
							Send invitation
						</Button>
					</div>
				</form>
			</Modal>
		</SettingsPageFrame>
	);
}

export function PlanSettingsPage() {
	return (
		<SettingsPageFrame title="Plan & Usage">
			<SettingsSection
				description="You are currently using Otto Free."
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
						href="/price"
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
					<Meter label="AI credits" limit={1000} tone="orange" value={184} />
					<Meter label="Contacts" limit={100} value={24} />
					<Meter label="Team members" limit={3} value={2} />
					<Meter label="Conversations" limit={20} value={6} />
					<Meter label="Messages" limit={200} value={42} />
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
				description="Manage the card and billing identity for Otto Labs."
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
					<Field defaultValue="Otto Labs" label="Legal name" />
					<Field
						defaultValue="billing@otto.so"
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
								<td>Otto Pro</td>
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
								<td>Otto Pro</td>
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
	id: number;
	name: string;
	type: string;
	key: string;
	created: string;
};
const seedKeys: ApiKey[] = [
	{
		id: 1,
		name: "Otto - Test Public API Key",
		type: "Test Public Key",
		key: "pk_test_5e3d...91a2",
		created: "Created Jul 14, 2026 at 10:54 PM",
	},
	{
		id: 2,
		name: "Otto - Public API Key",
		type: "Live Public Key",
		key: "pk_live_8b1c...85c5",
		created: "Created Jul 14, 2026 at 10:54 PM",
	},
];

export function DevelopersSettingsPage() {
	const [keys, setKeys] = useState(seedKeys);
	const [keyOpen, setKeyOpen] = useState(false);
	const [newKeyName, setNewKeyName] = useState("");
	const [byok, setByok] = useState(false);
	const [byokKey, setByokKey] = useState("");
	const [domain, setDomain] = useState("otto.so");
	return (
		<SettingsPageFrame title="Developers">
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
							{keys.map((apiKey) => (
								<tr key={apiKey.id}>
									<td>
										<strong>{apiKey.name}</strong>
										<small>{apiKey.created}</small>
									</td>
									<td>
										<span className="od-badge">{apiKey.type}</span>
									</td>
									<td>—</td>
									<td>
										<span className="od-key-cell">
											{apiKey.key}
											<CopyButton
												label={`Copy ${apiKey.name}`}
												value={apiKey.key.replace("...", "_secret_")}
											/>
										</span>
									</td>
									<td>
										<Button
											onClick={() =>
												setKeys((current) =>
													current.filter((key) => key.id !== apiKey.id),
												)
											}
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
				description="Use a customer-owned OpenRouter API key for AI calls on this website."
				title="OpenRouter key"
			>
				<div className="od-byok">
					<div className="od-byok__head">
						<div>
							<strong>Use your OpenRouter key</strong>
							<p>
								When enabled, AI calls use your OpenRouter key first and do not
								debit Otto AI credits.
							</p>
						</div>
						<Toggle
							checked={byok}
							label="Use your OpenRouter key"
							onChange={setByok}
						/>
					</div>
					<p>
						Your key is encrypted at rest and is never returned by the API or
						displayed again after it is saved.
					</p>
					<div className="od-key-input">
						<Field
							label="OpenRouter API key"
							onChange={(event) => setByokKey(event.target.value)}
							placeholder="sk-or-v1-..."
							type="password"
							value={byokKey}
						/>
						<Button disabled={!byokKey} variant="primary">
							Save key
						</Button>
					</div>
					<span className="od-badge">No key saved</span>
				</div>
				<PanelFooter>
					<span>BYOK is available on Pro</span>
					<Link className="od-inline-link" href="/settings/plan">
						Upgrade
					</Link>
				</PanelFooter>
			</SettingsSection>
			<SettingsSection
				description="Only these domains and subdomains can use your public keys."
				title="Allowed domains"
			>
				<div className="od-domain-row">
					<Globe2Icon />
					<Field
						aria-label="Allowed domain"
						label="Domain"
						onChange={(event) => setDomain(event.target.value)}
						value={domain}
					/>
					<Button aria-label="Remove domain" size="icon" variant="ghost">
						<Trash2 size={15} />
					</Button>
				</div>
				<PanelFooter>
					<Button>
						<Plus size={15} /> Add domain
					</Button>
					<Button variant="primary">Save domains</Button>
				</PanelFooter>
			</SettingsSection>
			<Modal
				description="Use separate keys for development, preview, and production environments."
				onClose={() => setKeyOpen(false)}
				open={keyOpen}
				title="Create API key"
			>
				<form
					onSubmit={(event: FormEvent) => {
						event.preventDefault();
						if (!newKeyName.trim()) return;
						setKeys((current) => [
							...current,
							{
								id: Date.now(),
								name: newKeyName,
								type: "Test Public Key",
								key: `pk_test_${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
								created: "Created just now",
							},
						]);
						setNewKeyName("");
						setKeyOpen(false);
					}}
				>
					<div className="od-modal__body">
						<Field
							autoFocus
							label="Key name"
							onChange={(event) => setNewKeyName(event.target.value)}
							placeholder="Preview deployment"
							value={newKeyName}
						/>
						<SelectField defaultValue="Test Public Key" label="Key type">
							<option>Test Public Key</option>
							<option>Live Public Key</option>
							<option>Private API Key</option>
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
						<Button type="submit" variant="primary">
							Create key
						</Button>
					</div>
				</form>
			</Modal>
		</SettingsPageFrame>
	);
}

function Globe2Icon() {
	return <span className="od-domain-icon">www</span>;
}
