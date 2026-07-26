"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button, Field } from "@/components/dashboard/ui";
import { OtterGlyph } from "@/components/marks";
import { authClient } from "@/lib/auth-client";

type InvitePreview = { email: string; role: string; tenantName: string };

function Shell({ children }: { children: React.ReactNode }) {
	return (
		<main className="od-auth-page">
			<section className="od-auth-panel">
				<header className="od-auth-brand">
					<span>
						<OtterGlyph className="h-5 w-5" />
					</span>
					<div>
						<strong>Otter</strong>
						<small>Agent workspace</small>
					</div>
				</header>
				{children}
			</section>
		</main>
	);
}

export default function InviteAcceptPage() {
	const params = useParams<{ token: string }>();
	const router = useRouter();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [invite, setInvite] = useState<InvitePreview | null>(null);
	const [loadError, setLoadError] = useState("");
	const [loading, setLoading] = useState(true);
	const [mode, setMode] = useState<"sign-up" | "sign-in">("sign-up");
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState("");
	const [verifyNotice, setVerifyNotice] = useState(false);

	useEffect(() => {
		let active = true;
		fetch(`/api/invites/${params.token}`)
			.then(async (response) => {
				const body = (await response.json().catch(() => null)) as
					| (InvitePreview & { error?: string })
					| null;
				if (!response.ok) throw new Error(body?.error ?? "invite_not_found");
				return body as InvitePreview;
			})
			.then((body) => {
				if (active) setInvite(body);
			})
			.catch((err: Error) => {
				if (active) setLoadError(err.message);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [params.token]);

	async function acceptInvite() {
		setSubmitting(true);
		setFormError("");
		const response = await fetch(`/api/invites/${params.token}/accept`, {
			method: "POST",
		});
		setSubmitting(false);
		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as {
				error?: string;
			} | null;
			setFormError(body?.error ?? "accept_failed");
			return;
		}
		router.replace("/dashboard");
	}

	async function submitAuth(event: FormEvent) {
		event.preventDefault();
		if (!invite) return;
		setSubmitting(true);
		setFormError("");
		const result =
			mode === "sign-in"
				? await authClient.signIn.email({ email: invite.email, password })
				: await authClient.signUp.email({
						name: name.trim(),
						email: invite.email,
						password,
					});
		setSubmitting(false);
		if (result.error) {
			setFormError(
				result.error.message || "Could not authenticate. Try again.",
			);
			return;
		}
		if (mode === "sign-up") {
			setVerifyNotice(true);
			return;
		}
		await acceptInvite();
	}

	if (loading || sessionPending) {
		return (
			<Shell>
				<div className="od-auth-loading">
					<LoaderCircle className="od-auth-spinner" size={18} />
				</div>
			</Shell>
		);
	}

	if (loadError || !invite) {
		const message =
			loadError === "invite_expired"
				? "This invitation has expired."
				: loadError === "invite_already_accepted"
					? "This invitation has already been accepted."
					: "This invitation link isn't valid.";
		return (
			<Shell>
				<div className="od-auth-copy">
					<h1>{message}</h1>
					<p>Ask whoever invited you to send a new one.</p>
				</div>
			</Shell>
		);
	}

	if (verifyNotice) {
		return (
			<Shell>
				<div className="od-auth-copy">
					<h1>Check your email</h1>
					<p>
						Verify your address, then come back to this same link to finish
						joining {invite.tenantName}.
					</p>
				</div>
			</Shell>
		);
	}

	if (session) {
		return (
			<Shell>
				<div className="od-auth-copy">
					<p>You're signed in as {session.user.email}</p>
					<h1>Join {invite.tenantName} on Otter?</h1>
				</div>
				{formError ? <p className="od-auth-error">{formError}</p> : null}
				<Button
					className="od-auth-submit"
					disabled={submitting}
					onClick={() => void acceptInvite()}
					variant="primary"
				>
					{submitting ? (
						<LoaderCircle className="od-auth-spinner" size={16} />
					) : (
						<ArrowRight size={16} />
					)}
					Accept invitation
				</Button>
			</Shell>
		);
	}

	return (
		<Shell>
			<div className="od-auth-copy">
				<p>You've been invited to</p>
				<h1>{invite.tenantName}</h1>
			</div>
			<div
				className="od-auth-tabs"
				role="tablist"
				aria-label="Authentication mode"
			>
				<button
					aria-selected={mode === "sign-up"}
					onClick={() => setMode("sign-up")}
					role="tab"
					type="button"
				>
					Create account
				</button>
				<button
					aria-selected={mode === "sign-in"}
					onClick={() => setMode("sign-in")}
					role="tab"
					type="button"
				>
					Sign in
				</button>
			</div>
			<form className="od-auth-form" onSubmit={submitAuth}>
				<Field label="Email" readOnly value={invite.email} />
				{mode === "sign-up" ? (
					<Field
						autoComplete="name"
						label="Name"
						onChange={(event) => setName(event.target.value)}
						required
						value={name}
					/>
				) : null}
				<Field
					autoComplete={
						mode === "sign-in" ? "current-password" : "new-password"
					}
					hint={mode === "sign-up" ? "Use at least 8 characters." : undefined}
					label="Password"
					minLength={8}
					onChange={(event) => setPassword(event.target.value)}
					required
					type="password"
					value={password}
				/>
				{formError ? <p className="od-auth-error">{formError}</p> : null}
				<Button
					className="od-auth-submit"
					disabled={submitting}
					type="submit"
					variant="primary"
				>
					{submitting ? (
						<LoaderCircle className="od-auth-spinner" size={16} />
					) : (
						<ArrowRight size={16} />
					)}
					{mode === "sign-in" ? "Sign in and accept" : "Create account"}
				</Button>
			</form>
		</Shell>
	);
}
