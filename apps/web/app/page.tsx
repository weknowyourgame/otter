"use client";

import { useState } from "react";

const logos = ["2020INC", "BEEM", "OE", "Pina", "BOTTL", "OSLO"];
const reviews = [
	["JW", "Jessica Wong", "UX Designer", "This tool does exactly what I need — without the bloat."],
	["MJ", "Mark Johnson", "Product Manager", "The UX is smooth, the features are powerful yet easy to use, and support replies within minutes."],
	["AT", "Alexandra Turner", "Data Science Engineer", "Boosted our workflow overnight ⚡"],
	["DS", "David Smith", "AI Research Scientist", "It just works. No headaches."],
	["SA", "Sarah Adams", "Blockchain Developer", "From onboarding to daily use, everything feels polished and purposeful."],
	["MA", "Michael Adams", "DevOps Engineer", "Saved my sanity. Finally a tool that does what it promises."],
];

function MirageMark() {
	return <span className="mirage-mark" aria-label="Mirage"><i /><i /><i /></span>;
}

function Arrow() { return <span className="mirage-arrow">↗</span>; }

export default function Home() {
	const [menuOpen, setMenuOpen] = useState(false);
	return <main className="mirage">
		<header className="mirage-nav">
			<a href="#top" className="mirage-logo"><MirageMark /></a>
			<nav className={menuOpen ? "mirage-links open" : "mirage-links"} aria-label="Primary"><a href="#pricing">Pricing</a><a href="#changelog">Changelog</a><a href="#customers">Customers</a><a href="#contact">Contact</a></nav>
			<a href="#pricing" className="mirage-get">Get Mirage</a>
			<button className="mirage-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? "×" : "☰"}</button>
		</header>

		<section className="mirage-hero" id="top">
			<div className="mirage-dots" />
			<div className="mirage-hero-content">
				<a href="#updates" className="mirage-badge"><b>NEW</b><span>Try Fuse: Multi-Agent Layer</span></a>
				<h1>Get agentic AI to work on your workflows</h1>
				<p>Automate repetitive tasks and focus on what matters most. Less friction, more flow.</p>
				<a href="#pricing" className="mirage-button light">Get Started</a>
			</div>
			<div className="mirage-logo-bar"><div className="mirage-logo-run">{logos.concat(logos).map((logo, i) => <b key={`${logo}${i}`}>{logo}</b>)}</div><p>Powering teams inside the world’s most innovative companies.</p></div>
		</section>

		<section className="mirage-showcase">
			<div className="mirage-video"><img src="/mirage/hero.jpg" alt="AI agent workspace" /><button aria-label="Play demo">▶</button></div>
			<div className="mirage-two-up">
				<article><span>◫ &nbsp; AI Rag</span><h3>Launch smarter apps in no time.</h3><p>Empower your tools with adaptive AI workflows built to scale instantly.</p></article>
				<article><span>⌘ &nbsp; Vector API</span><h3>Built to scale, ready to impress.</h3><p>Power next-gen applications with real-time adaptive intelligence.</p></article>
			</div>
		</section>

		<section className="mirage-customers" id="customers">
			<h2>Trusted by 18,000 businesses.</h2>
			<div className="mirage-customer-grid">
				{[["Drivana", "We use agentic AI to personalize every driving experience — from predictive routing to in-cabin automation."], ["BitBite", "Our agents optimize orders in real time. Thanks to token-based workflows, we serve 30% faster."], ["NeoPlay", "We use AI agents to adapt game difficulty, generate story arcs, and improve player engagement across sessions."], ["Marée", "Our AI agents forecast demand by location and weather, helping premium beverage brands deliver just-in-time."], ["Ravé & Sons.", "We use agentic AI to generate adaptive tasting journeys and personalize product drops."], ["GrndUnit", "We deploy AI agents to curate fashion recommendations based on mood, location, and weather data."]].map(([name, quote], index) => <article key={name} className={`customer-card c${index}`}><div className="customer-symbol">{index % 2 ? "✺" : "✦"}</div><b>{name}</b><p>“{quote}”</p></article>)}
			</div>
		</section>

		<section className="mirage-move">
			<h2>Move faster. Think bigger.</h2>
			<div className="mirage-feature-row"><div className="mirage-copy"><span>01 / AGENT RUNTIME</span><h3>Scale your team with autonomous AI agents.</h3><p>Deliver seamless experiences with hybrid rendering powered by adaptive AI.</p></div><img src="/mirage/agent.jpg" alt="Autonomous AI workspace" /></div>
			<div className="mirage-feature-row reverse"><img src="/mirage/token.png" alt="Token analytics dashboard" /><div className="mirage-copy"><span>02 / OBSERVABILITY</span><h3>Track how your models use tokens, in real time.</h3><p>Gain full visibility into prompt, completion, and system token usage — in real time.</p><div className="token-pill">GPT-5.5 <b>53 tokens used</b></div></div></div>
			<div className="mirage-feature-row"><div className="mirage-copy"><span>03 / PLAYGROUND</span><h3>Launch agents in a sandboxed playground.</h3><p>Simulate inputs, completions, and fine-tune behavior, without leaving your development flow.</p></div><img src="/mirage/sandbox.png" alt="Code sandbox" /></div>
		</section>

		<section className="mirage-actions"><h2>Turn decisions into actions.</h2><div className="mirage-action-grid">
			{[["Scale agents at lightning speed.", "Deploy and iterate faster with a runtime built for low-latency, high-frequency AI interactions."], ["Log every token, prompt, and response.", "Capture structured logs from your agents to debug, monitor, and improve outputs with confidence."], ["Deploy agents with confidence.", "Ship updates to your agent infrastructure with zero downtime, built-in rollbacks, and CI/CD integration."], ["Craft conversations that feel natural.", "Build agents that communicate with clarity, memory, and purpose — all customizable to your brand."], ["Custom logic. Full control.", "Write custom functions, conditionals, and handlers directly into your agents using flexible hooks."], ["Secure by default. Configurable by design.", "Manage permissions, enforce rate limits, and protect sensitive data across every agent session."]].map(([title, body], i) => <article key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{body}</p><Arrow /></article>)}
		</div></section>

		<section className="mirage-stats"><div><strong>135%</strong><p>in return of investment within 9 months.</p></div><div><strong>110%</strong><p>reduction in operational cost after AI agent integration.</p></div><div className="stat-art"><img src="/mirage/story.png" alt="AI system visualization" /></div></section>

		<section className="mirage-reviews"><div className="mirage-heading-row"><h2>What people say</h2><a href="#customers">Show more reviews <Arrow /></a></div><div className="mirage-review-grid">{reviews.map(([initials, name, role, quote]) => <article key={name}><div><i>{initials}</i><span><b>{name}</b><small>{role}</small></span></div><p>“{quote}”</p></article>)}</div></section>

		<section className="mirage-changelog" id="changelog"><div className="mirage-heading-row"><h2>We ship, a lot.</h2><a href="#updates">View all changelogs <Arrow /></a></div><div className="change-list">{[["May 6, 2025", "Fuse — Multi-Agent Layer (Beta)"], ["Apr 29, 2025", "Low-Latency Mode for Inference API"], ["Apr 1, 2025", "Code Interpreter — Run Python in Chat"]].map(([date, title], i) => <a href="#updates" className="change" key={title}><i className={`flower f${i}`}>✳</i><time>{date}</time><b>{title}</b><Arrow /></a>)}</div></section>

		<section className="mirage-final" id="pricing"><div className="mirage-dots" /><div><h2>Start building with agents in minutes.</h2><a href="#contact" className="mirage-button light">Get Started</a></div></section>
		<footer className="mirage-footer" id="contact"><div><MirageMark /><nav><a href="#pricing">Pricing</a><a href="#changelog">Changelog</a><a href="#customers">Customers</a><a href="#contact">Contact</a></nav><p>hi@mirage.com</p></div><div className="mirage-word">Mirage</div><div className="mirage-footer-bottom"><span>© 2025 Mirage</span><span>𝕏 &nbsp; Github &nbsp; Youtube</span></div></footer>
	</main>;
}
