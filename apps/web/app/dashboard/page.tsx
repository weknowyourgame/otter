"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { OttoWordmark } from "@/components/marks";

interface SessionEvent {
	at: number;
	kind: "user" | "agent" | "step" | "result";
	text: string;
}
interface SessionSummary {
	id: string;
	createdAt: number;
	updatedAt: number;
	title: string;
	steps: number;
	source: "ai" | "local";
	state: "active" | "done" | "failed";
	events: SessionEvent[];
}

const DEMO_KEY = "otto_pk_demo_4f9d2c81b7a35e60";
const SNIPPET = `<script src="https://cdn.otto.dev/otto.js"
        data-endpoint="${typeof window === "undefined" ? "" : ""}/api/agent"
        data-key="${DEMO_KEY}"
        defer></script>`;

export default function Dashboard() {
	return (
		<div className="min-h-screen bg-ink text-zinc-100">
			<header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl">
				<div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
					<Link href="/">
						<OttoWordmark />
					</Link>
					<div className="flex items-center gap-6 text-[13.5px]">
						<Link href="/demo" className="text-zinc-400 transition hover:text-white">
							Live demo
						</Link>
						<span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-zinc-300">
							<span className="grid h-5 w-5 place-items-center rounded-full bg-accent/25 text-[10px] font-bold text-accent-soft">
								A
							</span>
							Acme Inc — Free plan
						</span>
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-5xl px-6 py-12">
				<h1 className="mb-1 text-2xl font-semibold tracking-tight">Workspace</h1>
				<p className="mb-10 text-[14px] text-zinc-400">
					Your install snippet, keys, and live agent sessions.
				</p>

				<div className="mb-6 grid gap-5 md:grid-cols-2">
					<ApiKeyCard />
					<ModelCard />
				</div>
				<SnippetCard />
				<Sessions />
			</main>
		</div>
	);
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
	return (
		<section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-[14.5px] font-semibold">{title}</h2>
				{action}
			</div>
			{children}
		</section>
	);
}

function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			onClick={() => {
				void navigator.clipboard.writeText(value);
				setCopied(true);
				setTimeout(() => setCopied(false), 1600);
			}}
			className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-zinc-300 transition hover:bg-white/[0.06]"
		>
			{copied ? "Copied ✓" : "Copy"}
		</button>
	);
}

function ApiKeyCard() {
	return (
		<Card title="Publishable key" action={<CopyButton value={DEMO_KEY} />}>
			<code className="block truncate rounded-xl bg-black/40 px-4 py-3 font-mono text-[13px] text-accent-soft">
				{DEMO_KEY}
			</code>
			<p className="mt-3 text-[12.5px] leading-relaxed text-zinc-500">
				Safe for the browser. Scopes widget traffic to this workspace in production deployments.
			</p>
		</Card>
	);
}

function ModelCard() {
	return (
		<Card title="Agent model">
			<div className="flex items-center justify-between rounded-xl bg-black/40 px-4 py-3">
				<span className="font-mono text-[13px] text-zinc-200">anthropic/claude-sonnet-4.5</span>
				<span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-400">
					via OpenRouter
				</span>
			</div>
			<p className="mt-3 text-[12.5px] leading-relaxed text-zinc-500">
				Set <code className="font-mono text-zinc-300">OPENROUTER_API_KEY</code> and optionally{" "}
				<code className="font-mono text-zinc-300">AGENT_MODEL</code> in the server environment.
				Without a key, sessions run on the keyless demo planner.
			</p>
		</Card>
	);
}

function SnippetCard() {
	return (
		<div className="mb-6">
			<Card title="Install snippet" action={<CopyButton value={SNIPPET} />}>
				<pre className="overflow-x-auto rounded-xl bg-black/40 p-4 font-mono text-[12.5px] leading-relaxed text-zinc-300">
					<code>{SNIPPET}</code>
				</pre>
				<p className="mt-3 text-[12.5px] leading-relaxed text-zinc-500">
					React apps can{" "}
					<code className="font-mono text-zinc-300">import {"{ init }"} from &quot;otto-sdk&quot;</code>{" "}
					instead — pass <code className="font-mono text-zinc-300">user</code> for session attribution.
				</p>
			</Card>
		</div>
	);
}

function Sessions() {
	const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
	const [open, setOpen] = useState<string | null>(null);

	const load = useCallback(async () => {
		try {
			const res = await fetch("/api/sessions");
			const body = (await res.json()) as { sessions: SessionSummary[] };
			setSessions(body.sessions);
		} catch {
			setSessions([]);
		}
	}, []);

	useEffect(() => {
		void load();
		const t = setInterval(() => void load(), 5000);
		return () => clearInterval(t);
	}, [load]);

	return (
		<Card
			title="Agent sessions"
			action={<span className="text-[11.5px] text-zinc-500">live · refreshes every 5s</span>}
		>
			{!sessions || sessions.length === 0 ? (
				<div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
					<p className="text-[13.5px] text-zinc-400">No sessions yet.</p>
					<p className="mt-1 text-[12.5px] text-zinc-600">
						Open the{" "}
						<Link href="/demo" className="text-accent-soft hover:underline">
							live demo
						</Link>{" "}
						and ask Otto to do something — it shows up here in real time.
					</p>
				</div>
			) : (
				<ul className="divide-y divide-white/[0.05]">
					{sessions.map((s) => (
						<li key={s.id}>
							<button
								type="button"
								onClick={() => setOpen(open === s.id ? null : s.id)}
								className="flex w-full items-center gap-4 py-3.5 text-left"
							>
								<StateDot state={s.state} />
								<span className="flex-1 truncate text-[13.5px] text-zinc-200">{s.title}</span>
								<span className="text-[12px] text-zinc-500">
									{s.steps} step{s.steps === 1 ? "" : "s"}
								</span>
								<span
									className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
										s.source === "ai"
											? "bg-accent/15 text-accent-soft"
											: "bg-amber-400/10 text-amber-300"
									}`}
								>
									{s.source === "ai" ? "AI" : "keyless"}
								</span>
								<span className="w-16 text-right text-[11.5px] tabular-nums text-zinc-600">
									{timeAgo(s.updatedAt)}
								</span>
							</button>
							{open === s.id && (
								<div className="mb-4 ml-6 rounded-xl border border-white/[0.06] bg-black/30 p-4">
									{s.events.length === 0 ? (
										<p className="text-[12.5px] text-zinc-600">No events recorded.</p>
									) : (
										<ul className="space-y-1.5">
											{s.events.map((e, i) => (
												<li key={i} className="flex gap-3 text-[12.5px] leading-relaxed">
													<span className="w-12 flex-none pt-px text-[10.5px] font-semibold uppercase tracking-wide text-zinc-600">
														{e.kind}
													</span>
													<span className={e.kind === "user" ? "text-zinc-100" : "text-zinc-400"}>
														{e.text}
													</span>
												</li>
											))}
										</ul>
									)}
								</div>
							)}
						</li>
					))}
				</ul>
			)}
		</Card>
	);
}

function StateDot({ state }: { state: SessionSummary["state"] }) {
	const cls =
		state === "active"
			? "bg-accent animate-pulse"
			: state === "done"
				? "bg-emerald-400"
				: "bg-red-400";
	return <span className={`h-2 w-2 flex-none rounded-full ${cls}`} />;
}

function timeAgo(ts: number): string {
	const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
	if (s < 60) return `${s}s ago`;
	const m = Math.round(s / 60);
	if (m < 60) return `${m}m ago`;
	return `${Math.round(m / 60)}h ago`;
}
