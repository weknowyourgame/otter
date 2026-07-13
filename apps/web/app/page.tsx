import Link from "next/link";
import { OttoGlyph, OttoWordmark } from "@/components/marks";

const SNIPPET = `<script src="https://cdn.otto.dev/otto.js"
        data-endpoint="https://your-app.com/api/agent"
        defer></script>`;

export default function Landing() {
	return (
		<div className="min-h-screen bg-ink text-zinc-100">
			<Nav />
			<Hero />
			<Features />
			<HowItWorks />
			<Install />
			<CtaBand />
			<Footer />
		</div>
	);
}

function Nav() {
	return (
		<header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
				<Link href="/">
					<OttoWordmark />
				</Link>
				<nav className="hidden items-center gap-8 text-[13.5px] text-zinc-400 sm:flex">
					<a href="#how" className="transition hover:text-white">
						How it works
					</a>
					<a href="#install" className="transition hover:text-white">
						Install
					</a>
					<Link href="/dashboard" className="transition hover:text-white">
						Dashboard
					</Link>
				</nav>
				<Link
					href="/demo"
					className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-zinc-200"
				>
					Live demo
				</Link>
			</div>
		</header>
	);
}

function Hero() {
	return (
		<section className="hero-glow relative overflow-hidden">
			<div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_20%,black,transparent)]" />
			<div className="relative mx-auto max-w-6xl px-6 pb-24 pt-24 sm:pt-32">
				<div className="mx-auto max-w-3xl text-center">
					<p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[12.5px] font-medium text-zinc-300">
						<span className="h-1.5 w-1.5 rounded-full bg-accent" />
						The AI support agent that lives in your product
					</p>
					<h1 className="text-balance text-5xl font-semibold leading-[1.06] tracking-tight sm:text-6xl">
						Support that <span className="text-accent-soft">does it</span> for your customers.
					</h1>
					<p className="mx-auto mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-zinc-400">
						When someone asks <em className="text-zinc-200">“how do I enable 2FA?”</em>, Otto doesn’t
						link an article. With one click of permission, it takes the cursor and completes the
						task — live, in their browser, step by visible step.
					</p>
					<div className="mt-10 flex items-center justify-center gap-4">
						<Link
							href="/demo"
							className="rounded-xl bg-accent px-6 py-3 text-[14.5px] font-semibold text-white shadow-[0_8px_30px_rgba(91,108,249,0.4)] transition hover:brightness-110"
						>
							Watch it work — live demo
						</Link>
						<a
							href="#install"
							className="rounded-xl border border-white/12 px-6 py-3 text-[14.5px] font-semibold text-zinc-200 transition hover:bg-white/[0.06]"
						>
							Install in a minute
						</a>
					</div>
				</div>

				<WidgetVignette />
			</div>
		</section>
	);
}

/** A faithful still of the product mid-task — pure CSS, no screenshot. */
function WidgetVignette() {
	return (
		<div className="relative mx-auto mt-20 max-w-4xl">
			<div className="rounded-2xl border border-white/10 bg-ink-2 shadow-[0_40px_120px_rgba(0,0,0,0.5)]">
				{/* browser chrome */}
				<div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
					<span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
					<span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
					<span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
					<span className="ml-4 rounded-md bg-white/[0.05] px-3 py-1 font-mono text-[11px] text-zinc-500">
						app.nimbus.io/settings/security
					</span>
				</div>
				{/* fake app */}
				<div className="relative grid grid-cols-[180px_1fr] max-sm:grid-cols-1">
					<div className="border-r border-white/[0.06] p-5 max-sm:hidden">
						<div className="mb-6 h-2.5 w-16 rounded bg-white/15" />
						{["w-20", "w-24", "w-16", "w-24", "w-20"].map((w, i) => (
							<div key={i} className={`mb-3.5 h-2 ${w} rounded bg-white/[0.08]`} />
						))}
					</div>
					<div className="p-7 pr-[300px] max-sm:pr-7">
						<div className="mb-2 h-3 w-44 rounded bg-white/20" />
						<div className="mb-8 h-2 w-72 max-w-full rounded bg-white/[0.08]" />
						{/* highlighted 2FA row */}
						<div className="relative mb-4 flex items-center justify-between rounded-xl border-2 border-accent bg-accent/[0.07] p-4 shadow-[0_0_0_4px_rgba(91,108,249,0.15),0_0_28px_rgba(91,108,249,0.3)]">
							<div>
								<div className="mb-1.5 h-2.5 w-40 rounded bg-white/25" />
								<div className="h-2 w-56 max-w-full rounded bg-white/[0.1]" />
							</div>
							<div className="rounded-lg bg-accent px-3.5 py-2 text-[12px] font-semibold text-white">
								Enable
							</div>
							{/* cursor */}
							<div className="absolute -bottom-3 right-9">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
									<path
										d="M4.5 2.5L19.5 11.2L12.6 13.1L9.4 19.6L4.5 2.5Z"
										fill="#5B6CF9"
										stroke="white"
										strokeWidth="1.6"
										strokeLinejoin="round"
									/>
								</svg>
								<span className="absolute left-3.5 top-4 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
									Otto
								</span>
							</div>
						</div>
						{[1, 2].map((i) => (
							<div key={i} className="mb-4 flex items-center justify-between rounded-xl border border-white/[0.07] p-4">
								<div>
									<div className="mb-1.5 h-2.5 w-32 rounded bg-white/15" />
									<div className="h-2 w-48 max-w-full rounded bg-white/[0.07]" />
								</div>
								<div className="h-7 w-16 rounded-lg bg-white/[0.08]" />
							</div>
						))}
					</div>

					{/* widget panel */}
					<div className="absolute bottom-5 right-5 w-[264px] rounded-2xl border border-white/12 bg-[#101116]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl max-sm:hidden">
						<div className="mb-3 flex items-center gap-2.5">
							<span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-accent to-[#3d47c9]">
								<OttoGlyph className="h-3 w-3 text-white" />
							</span>
							<div>
								<p className="text-[12px] font-semibold text-white">Otto</p>
								<p className="text-[9.5px] text-zinc-500">AI support — it does it for you</p>
							</div>
						</div>
						<div className="mb-2.5 ml-auto w-fit rounded-xl rounded-br-[5px] bg-accent px-3 py-1.5 text-[11.5px] text-white">
							How do I enable 2FA?
						</div>
						<div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 text-[11px] text-zinc-400">
							{[
								["done", "Opening security settings…"],
								["done", "Finding two-factor authentication…"],
								["active", "Clicking “Enable”…"],
							].map(([state, label], i) => (
								<div key={i} className="flex items-center gap-2 py-1">
									{state === "done" ? (
										<svg className="h-3 w-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
											<path d="M5 12.5l4.5 4.5L19 7.5" />
										</svg>
									) : (
										<span className="h-3 w-3 animate-spin rounded-full border-[2px] border-accent border-t-transparent" />
									)}
									<span className={state === "active" ? "text-zinc-200" : ""}>{label}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* working pill */}
			<div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/12 bg-[#101116]/95 py-2.5 pl-4 pr-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl">
				<span className="relative flex h-2 w-2">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
					<span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
				</span>
				<span className="text-[12.5px] font-medium text-zinc-200">Otto is working…</span>
				<span className="h-4 w-px bg-white/15" />
				<span className="rounded-full px-3 py-1 text-[12.5px] font-semibold text-[#FF8480]">Stop</span>
			</div>
		</div>
	);
}

function Features() {
	const items = [
		{
			title: "It acts, not answers",
			body: "Otto reads the live page, plans the route, and clicks and types its way to done — settings changed, invite sent, 2FA enabled. The task finishes on screen, not in a help article.",
			icon: (
				<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
					<path d="M4.5 2.5L19.5 11.2L12.6 13.1L9.4 19.6L4.5 2.5Z" />
				</svg>
			),
		},
		{
			title: "Permission-first, always stoppable",
			body: "Nothing moves until the customer clicks Allow. Every step streams into view, a Stop button floats on the page, and destructive actions get their own explicit confirmation — non-negotiable, client-side.",
			icon: (
				<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
					<path d="M12 3l7.5 3v5.2c0 4.6-3.2 8.2-7.5 9.8-4.3-1.6-7.5-5.2-7.5-9.8V6L12 3z" />
					<path d="M9.2 12.2l2 2 3.6-4" />
				</svg>
			),
		},
		{
			title: "One script tag, feels native",
			body: "A drop-in widget with real taste: shadow-DOM isolated, light and dark, spring motion, your accent color. Your customers will think you built it in-house.",
			icon: (
				<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
					<path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
				</svg>
			),
		},
	];
	return (
		<section className="mx-auto max-w-6xl px-6 py-28">
			<div className="grid gap-5 md:grid-cols-3">
				{items.map((f) => (
					<div
						key={f.title}
						className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-7 transition duration-300 hover:border-accent/40 hover:bg-white/[0.04]"
					>
						<div className="mb-5 grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent-soft transition group-hover:bg-accent/25">
							{f.icon}
						</div>
						<h3 className="mb-2.5 text-[16px] font-semibold tracking-tight">{f.title}</h3>
						<p className="text-[13.5px] leading-relaxed text-zinc-400">{f.body}</p>
					</div>
				))}
			</div>
		</section>
	);
}

function HowItWorks() {
	const steps = [
		["Customer asks", "“Where do I enable 2FA?” — typed into the Otto widget in your app."],
		["Otto reads the page", "The SDK serializes what's actually on screen — every button, link, and field — and sends it to the agent."],
		["One Allow, then it drives", "The customer grants permission once. Otto's cursor navigates, clicks, and types, streaming each step as it lands."],
		["Done, visibly", "The task ends completed on screen — QR code up, invite sent — with a step-by-step receipt in the chat."],
	];
	return (
		<section id="how" className="border-y border-white/[0.06] bg-ink-2/50">
			<div className="mx-auto max-w-6xl px-6 py-28">
				<h2 className="mb-3 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
					From question to done in seconds
				</h2>
				<p className="mx-auto mb-16 max-w-lg text-center text-[15px] text-zinc-400">
					No deflection scores. No “was this article helpful?”. The metric is tasks completed.
				</p>
				<div className="grid gap-10 md:grid-cols-4">
					{steps.map(([title, body], i) => (
						<div key={title} className="relative">
							<div className="mb-4 flex items-center gap-3">
								<span className="grid h-8 w-8 flex-none place-items-center rounded-full border border-accent/40 bg-accent/10 text-[13px] font-semibold text-accent-soft">
									{i + 1}
								</span>
								{i < steps.length - 1 && (
									<span className="hidden h-px flex-1 bg-gradient-to-r from-white/15 to-transparent md:block" />
								)}
							</div>
							<h3 className="mb-2 text-[15px] font-semibold">{title}</h3>
							<p className="text-[13px] leading-relaxed text-zinc-400">{body}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function Install() {
	return (
		<section id="install" className="mx-auto max-w-6xl px-6 py-28">
			<div className="grid items-center gap-14 md:grid-cols-2">
				<div>
					<h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
						Live before your coffee cools
					</h2>
					<p className="mb-8 max-w-md text-[15px] leading-relaxed text-zinc-400">
						Paste one script tag, point it at your agent endpoint, done. Or install{" "}
						<code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[13px] text-zinc-200">
							otto-sdk
						</code>{" "}
						from npm and call{" "}
						<code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[13px] text-zinc-200">
							init()
						</code>{" "}
						with your logged-in user for session attribution.
					</p>
					<Link
						href="/dashboard"
						className="inline-flex items-center gap-2 text-[14px] font-semibold text-accent-soft transition hover:text-white"
					>
						Get your snippet in the dashboard
						<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M5 12h14M13 6l6 6-6 6" />
						</svg>
					</Link>
				</div>
				<div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-2 shadow-2xl">
					<div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
						<span className="font-mono text-[11.5px] text-zinc-500">index.html</span>
						<span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-400">
							~40 KB gzipped
						</span>
					</div>
					<pre className="overflow-x-auto p-6 font-mono text-[13px] leading-relaxed text-zinc-300">
						<code>{SNIPPET}</code>
					</pre>
				</div>
			</div>
		</section>
	);
}

function CtaBand() {
	return (
		<section className="mx-auto max-w-6xl px-6 pb-28">
			<div className="hero-glow relative overflow-hidden rounded-3xl border border-white/10 bg-ink-2 px-8 py-16 text-center">
				<div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
				<div className="relative">
					<h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
						See Otto enable 2FA in a real app
					</h2>
					<p className="mx-auto mb-9 max-w-md text-[15px] text-zinc-400">
						The demo is a live SaaS with real settings. Ask Otto anything — then watch the cursor.
					</p>
					<Link
						href="/demo"
						className="inline-block rounded-xl bg-accent px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_30px_rgba(91,108,249,0.4)] transition hover:brightness-110"
					>
						Open the live demo
					</Link>
				</div>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer className="border-t border-white/[0.06]">
			<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
				<OttoWordmark />
				<p className="text-[12.5px] text-zinc-500">
					Support that completes the task instead of explaining it.
				</p>
			</div>
		</footer>
	);
}
