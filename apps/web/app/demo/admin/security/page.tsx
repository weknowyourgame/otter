"use client";

import { useState } from "react";
import { useStore } from "@/components/cordant/store";
import {
	Badge,
	Button,
	Input,
	PageHeader,
	Panel,
	Row,
	Select,
	Textarea,
	Toggle,
} from "@/components/cordant/ui";

export default function AdminSecurity() {
	const [sso, setSso] = useStore("sso-enabled", false);
	const [org2fa, setOrg2fa] = useStore("org-2fa-required", false);
	const [sessionTimeout, setSessionTimeout] = useStore(
		"session-timeout",
		"24 hours",
	);
	const [allowlist, setAllowlist] = useStore("ip-allowlist", "");
	const [ssoStage, setSsoStage] = useState<null | "config">(null);
	const [idpUrl, setIdpUrl] = useState("");
	const [allowlistSaved, setAllowlistSaved] = useState(false);

	return (
		<>
			<PageHeader
				title="Security & SSO"
				sub="Organization-wide authentication policy — applies to every member."
				crumbs={[{ label: "Admin console" }, { label: "Security & SSO" }]}
			/>

			<Panel title="Single sign-on">
				{!sso && ssoStage === null && (
					<Row
						label="SAML SSO"
						sub="Require members to sign in through your identity provider."
					>
						<Button variant="primary" onClick={() => setSsoStage("config")}>
							Configure SSO
						</Button>
					</Row>
				)}
				{ssoStage === "config" && (
					<div className="py-2">
						<p className="mb-3 text-[13px] text-zinc-600">
							Enter your identity provider's metadata URL to connect SAML SSO.
						</p>
						<div className="mb-4 max-w-md">
							<Input
								aria-label="IdP metadata URL"
								placeholder="https://idp.acme.io/saml/metadata"
								value={idpUrl}
								onChange={(e) => setIdpUrl(e.target.value)}
							/>
						</div>
						<div className="flex gap-2.5">
							<Button
								variant="primary"
								onClick={() => {
									if (!idpUrl.trim()) return;
									setSso(true);
									setSsoStage(null);
								}}
							>
								Connect
							</Button>
							<Button onClick={() => setSsoStage(null)}>Cancel</Button>
						</div>
					</div>
				)}
				{sso && ssoStage === null && (
					<Row
						label="SAML SSO"
						sub={idpUrl || "Connected to your identity provider."}
					>
						<div className="flex items-center gap-3">
							<Badge tone="green">Connected</Badge>
							<Button variant="danger" onClick={() => setSso(false)}>
								Disconnect
							</Button>
						</div>
					</Row>
				)}
			</Panel>

			<Panel title="Two-factor authentication policy">
				<Row
					label="Require 2FA for all members"
					sub="Organization-wide enforcement — distinct from a member's own 2FA setting under My Settings → Security."
				>
					<Toggle
						checked={org2fa}
						onChange={setOrg2fa}
						label="Require 2FA for all members"
					/>
				</Row>
			</Panel>

			<Panel title="Sessions">
				<Row
					label="Session timeout"
					sub="Members are signed out after this period of inactivity."
				>
					<Select
						aria-label="Session timeout"
						value={sessionTimeout}
						onChange={setSessionTimeout}
						options={["1 hour", "8 hours", "24 hours", "7 days", "30 days"]}
					/>
				</Row>
			</Panel>

			<Panel
				title="Network"
				footer={
					<div className="flex flex-wrap items-center gap-3">
						<Button variant="primary" onClick={() => setAllowlistSaved(true)}>
							Save allowlist
						</Button>
						{allowlistSaved ? (
							<span className="text-[12.5px] font-medium text-emerald-600">
								Allowlist saved
							</span>
						) : null}
					</div>
				}
			>
				<p className="mb-2 text-[12.5px] font-medium text-zinc-600">
					IP allowlist
				</p>
				<p className="mb-3 text-[12px] text-zinc-500">
					One CIDR range per line. Leave empty to allow any network.
				</p>
				<Textarea
					aria-label="IP allowlist"
					rows={3}
					placeholder="203.0.113.0/24"
					value={allowlist}
					onChange={(e) => {
						setAllowlist(e.target.value);
						setAllowlistSaved(false);
					}}
				/>
			</Panel>
		</>
	);
}
