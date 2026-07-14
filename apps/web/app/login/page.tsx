"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button, Field } from "@/components/dashboard/ui";
import { OttoGlyph } from "@/components/marks";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";
const GRID_CELLS = Array.from(
	{ length: 48 },
	(_, index) => `cell-${index + 1}`,
);

export default function LoginPage() {
	const router = useRouter();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [mode, setMode] = useState<AuthMode>("sign-in");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!sessionPending && session) router.replace("/dashboard");
	}, [router, session, sessionPending]);

	async function submit(event: FormEvent) {
		event.preventDefault();
		setSubmitting(true);
		setError("");
		const result =
			mode === "sign-in"
				? await authClient.signIn.email({ email, password })
				: await authClient.signUp.email({ name: name.trim(), email, password });
		setSubmitting(false);
		if (result.error) {
			setError(
				result.error.message ||
					"Could not authenticate. Check your details and try again.",
			);
			return;
		}
		const next = new URLSearchParams(window.location.search).get("next");
		router.replace(next?.startsWith("/") ? next : "/dashboard");
		router.refresh();
	}

	return (
		<main className="od-auth-page">
			<div className="od-auth-grid" aria-hidden>
				{GRID_CELLS.map((cell) => (
					<span key={cell} />
				))}
			</div>
			<section className="od-auth-panel">
				<header className="od-auth-brand">
					<span>
						<OttoGlyph className="h-5 w-5" />
					</span>
					<div>
						<strong>Otto</strong>
						<small>Agent workspace</small>
					</div>
				</header>

				<div className="od-auth-copy">
					<p>{mode === "sign-in" ? "Welcome back" : "Create your workspace"}</p>
					<h1>
						{mode === "sign-in"
							? "Continue where your agent left off."
							: "Give your agent a secure home."}
					</h1>
				</div>

				<div
					className="od-auth-tabs"
					role="tablist"
					aria-label="Authentication mode"
				>
					<button
						aria-selected={mode === "sign-in"}
						onClick={() => setMode("sign-in")}
						role="tab"
						type="button"
					>
						Sign in
					</button>
					<button
						aria-selected={mode === "sign-up"}
						onClick={() => setMode("sign-up")}
						role="tab"
						type="button"
					>
						Create account
					</button>
				</div>

				<form className="od-auth-form" onSubmit={submit}>
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
						autoComplete="email"
						label="Email"
						onChange={(event) => setEmail(event.target.value)}
						required
						type="email"
						value={email}
					/>
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
					{error ? <p className="od-auth-error">{error}</p> : null}
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
						{mode === "sign-in" ? "Enter workspace" : "Create workspace"}
					</Button>
				</form>
				<footer>
					<span>Secure sessions</span>
					<span>Tenant-isolated keys</span>
				</footer>
			</section>
		</main>
	);
}
