"use client";

import { useState } from "react";
import { useStore } from "@/components/cordant/store";
import {
	Badge,
	Button,
	FakeQR,
	Input,
	PageHeader,
	Panel,
	Row,
	Toggle,
} from "@/components/cordant/ui";

export default function Security() {
	const [twoFA, setTwoFA] = useStore("2fa-enabled", false);
	const [sessionAlerts, setSessionAlerts] = useStore("session-alerts", true);
	const [resetSent, setResetSent] = useStore("password-reset-sent", false);
	// wizard: null = closed; "scan" | "verify" | "recovery"
	const [stage, setStage] = useState<null | "scan" | "verify" | "recovery">(
		null,
	);
	const [code, setCode] = useState("");
	const [codeError, setCodeError] = useState(false);

	const verify = () => {
		if (!/^\d{6}$/.test(code.trim())) {
			setCodeError(true);
			return;
		}
		setCodeError(false);
		setTwoFA(true);
		setStage("recovery");
	};

	return (
		<>
			<PageHeader
				title="Security"
				sub="Authentication and session protection for your own account — this only affects you, not the whole workspace."
				crumbs={[{ label: "My settings" }, { label: "Security" }]}
			/>

			<Panel
				title="Two-factor authentication"
				sub="A second factor keeps your account safe even if your password leaks."
			>
				{!twoFA && stage === null && (
					<Row
						label="Authenticator app"
						sub="Use TOTP codes from an app like 1Password or Google Authenticator."
					>
						<Button variant="primary" onClick={() => setStage("scan")}>
							Enable two-factor authentication
						</Button>
					</Row>
				)}

				{stage === "scan" && (
					<div className="py-2">
						<p className="mb-1 text-[13.5px] font-semibold text-zinc-800">
							Step 1 · Scan this QR code
						</p>
						<p className="mb-5 text-[12.5px] text-zinc-500">
							Open your authenticator app and scan the code to add Cordant.
						</p>
						<div className="mb-5 flex items-center gap-6 max-sm:flex-col max-sm:items-start">
							<FakeQR seed="cordant-demo-2fa" />
							<div className="text-[12.5px] leading-relaxed text-zinc-500">
								<p className="mb-1 font-medium text-zinc-700">Can't scan?</p>
								<p>Enter this setup key manually:</p>
								<code className="mt-1.5 block w-fit rounded-lg bg-zinc-100 px-3 py-1.5 font-mono text-[12px] tracking-widest text-zinc-800">
									CORD ANTD EMO2 FAKY
								</code>
							</div>
						</div>
						<div className="flex flex-wrap gap-2.5">
							<Button variant="primary" onClick={() => setStage("verify")}>
								I've scanned it — continue
							</Button>
							<Button onClick={() => setStage(null)}>Cancel</Button>
						</div>
					</div>
				)}

				{stage === "verify" && (
					<div className="py-2">
						<p className="mb-1 text-[13.5px] font-semibold text-zinc-800">
							Step 2 · Enter the 6-digit code
						</p>
						<p className="mb-4 text-[12.5px] text-zinc-500">
							Type the code your authenticator app is showing right now.
						</p>
						<div className="mb-1.5 grid max-w-xs gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
							<Input
								inputMode="numeric"
								maxLength={6}
								placeholder="123456"
								aria-label="Verification code"
								value={code}
								onChange={(e) => setCode(e.target.value)}
								className="font-mono tracking-[0.3em]"
							/>
							<Button variant="primary" onClick={verify}>
								Verify
							</Button>
						</div>
						{codeError && (
							<p className="text-[12.5px] font-medium text-red-600">
								That doesn't look like a 6-digit code — try again.
							</p>
						)}
					</div>
				)}

				{stage === "recovery" && (
					<div className="py-2">
						<div className="mb-4 flex flex-wrap items-center gap-2.5">
							<span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100">
								<svg
									aria-hidden="true"
									viewBox="0 0 24 24"
									className="h-3.5 w-3.5 text-emerald-600"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M5 12.5l4.5 4.5L19 7.5" />
								</svg>
							</span>
							<p className="text-[14px] font-semibold text-zinc-900">
								Two-factor authentication is on
							</p>
						</div>
						<p className="mb-3 text-[12.5px] text-zinc-500">
							Store these one-time recovery codes somewhere safe — they're your
							way in if you lose your phone.
						</p>
						<div className="mb-5 grid w-full max-w-sm grid-cols-1 gap-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 font-mono text-[12.5px] text-zinc-700 sm:grid-cols-2 sm:gap-x-8">
							{[
								"4KX2-9PLM",
								"8WQR-33ZN",
								"T6VD-01AH",
								"PB5E-7YKC",
								"MM2J-XR84",
								"ZC19-QQ5F",
							].map((c) => (
								<span key={c}>{c}</span>
							))}
						</div>
						<Button variant="primary" onClick={() => setStage(null)}>
							Done
						</Button>
					</div>
				)}

				{twoFA && stage === null && (
					<Row label="Authenticator app" sub="TOTP via your authenticator app.">
						<div className="flex flex-wrap items-center gap-3">
							<Badge tone="green">Enabled</Badge>
							<Button
								variant="danger"
								onClick={() => {
									setTwoFA(false);
									setCode("");
								}}
							>
								Disable
							</Button>
						</div>
					</Row>
				)}
			</Panel>

			<Panel title="Password">
				<Row
					label="Password"
					sub={
						resetSent
							? "Reset email sent to demo@cordant.io."
							: "Last changed 3 months ago."
					}
				>
					<div className="flex flex-wrap items-center gap-3">
						{resetSent ? <Badge tone="green">Reset sent</Badge> : null}
						<Button onClick={() => setResetSent(true)}>Send reset email</Button>
					</div>
				</Row>
			</Panel>

			<Panel title="Sessions">
				<Row
					label="New sign-in alerts"
					sub="Email me when a new device signs in."
				>
					<Toggle
						checked={sessionAlerts}
						onChange={setSessionAlerts}
						label="New sign-in alerts"
					/>
				</Row>
				<Row
					label="Active sessions"
					sub="MacBook Pro · San Francisco — this device."
				>
					<Button variant="danger">Sign out everywhere</Button>
				</Row>
			</Panel>
		</>
	);
}
