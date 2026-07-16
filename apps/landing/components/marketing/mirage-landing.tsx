import Link from "next/link";
import { OttoMark, OttoMascot } from "./logo";
import { SupportWidget } from "./support-widget";

const customerLogos = ["BEEM", "2020INC", "PIPELINX.CO", "WORKPORT"];

const workflowSteps = [
	{
		index: "01",
		title: "Understand the request",
		copy: "Otto reads the conversation, product state, and your approved knowledge sources.",
		status: "Context loaded",
	},
	{
		index: "02",
		title: "Ask before acting",
		copy: "The customer sees the exact action Otto wants to take before anything changes.",
		status: "Permission granted",
	},
	{
		index: "03",
		title: "Finish the work",
		copy: "Otto completes the workflow in-product and records the result for your team.",
		status: "Action complete",
	},
];

const updates = [
	["JUL 16, 2026", "Capped otter widget", "A calmer launcher, a cleaner conversation surface, and blinking mascot eyes."],
	["JUL 08, 2026", "Action approval gates", "Customers can inspect, approve, or stop every product action."],
	["JUN 24, 2026", "Knowledge sync", "Automatic source refreshes keep support answers aligned with the product."],
];

function PixelField() {
	return (
		<div aria-hidden="true" className="ol-pixel-field">
			<div className="ol-pixel-grid ol-pixel-grid-a" />
			<div className="ol-pixel-grid ol-pixel-grid-b" />
			<div className="ol-scan-line" />
		</div>
	);
}

function ProductWindow() {
	return (
		<div className="ol-product-window">
			<div className="ol-window-bar">
				<span className="ol-window-dots"><i /><i /><i /></span>
				<span>otto.support/live</span>
			</div>
			<div className="ol-product-layout">
				<aside className="ol-product-sidebar" aria-label="Support workspace">
					<div className="ol-sidebar-brand"><OttoMark /><span>Otto</span></div>
					<span className="is-active">Inbox <b>12</b></span>
					<span>Knowledge</span>
					<span>Workflows</span>
					<span>Activity</span>
					<span>Settings</span>
				</aside>
				<div className="ol-conversation">
					<header>
						<div>
							<strong>Change subscription plan</strong>
							<span>Conversation #2841</span>
						</div>
						<span className="ol-live-state"><i /> Otto is working</span>
					</header>
					<div className="ol-message ol-message-user">
						<p>Can you move our workspace to the Pro plan?</p>
					</div>
					<div className="ol-message ol-message-otto">
						<span><OttoMascot /></span>
						<div>
							<p>I found your workspace and the Pro plan. The new total will be $79/month.</p>
							<div className="ol-action-card">
								<span>Ready to update</span>
								<strong>Starter <b>-&gt;</b> Pro</strong>
								<button type="button">Approve change</button>
							</div>
						</div>
					</div>
					<div className="ol-composer-preview">
						<span>Reply to customer...</span>
						<button aria-label="Send preview message" type="button">-&gt;</button>
					</div>
				</div>
				<aside className="ol-context-panel">
					<p>Customer context</p>
					<dl>
						<div><dt>Plan</dt><dd>Starter</dd></div>
						<div><dt>Seats</dt><dd>8</dd></div>
						<div><dt>Account</dt><dd>Healthy</dd></div>
					</dl>
					<div className="ol-context-source">
						<span>Source</span>
						<strong>Billing policy</strong>
						<small>Synced 8m ago</small>
					</div>
				</aside>
			</div>
		</div>
	);
}

function KnowledgeGraphic() {
	return (
		<div className="ol-knowledge-graphic">
			<div className="ol-knowledge-search"><span>/</span><p>Search knowledge</p><kbd>CMD K</kbd></div>
			<div className="ol-knowledge-item">
				<i>01</i>
				<div><strong>Upgrade a workspace plan</strong><span>Billing and subscriptions</span></div>
				<b>98%</b>
			</div>
			<div className="ol-knowledge-item">
				<i>02</i>
				<div><strong>Configure SSO</strong><span>Authentication and access</span></div>
				<b>94%</b>
			</div>
			<div className="ol-knowledge-item">
				<i>03</i>
				<div><strong>Invite a teammate</strong><span>Workspace administration</span></div>
				<b>91%</b>
			</div>
		</div>
	);
}

function InstallGraphic() {
	return (
		<div className="ol-code-window">
			<div className="ol-code-tabs"><span className="is-active">widget.tsx</span><span>theme.css</span></div>
			<pre>
				<code>
					<span className="ol-code-purple">import</span>{" "}
					<span className="ol-code-white">{"{ SupportWidget }"}</span>{" "}
					<span className="ol-code-purple">from</span>{" "}
					<span className="ol-code-green">{"\"@otto/next\""}</span>;
					{"\n\n"}
					<span className="ol-code-purple">export default</span>{" "}
					<span className="ol-code-blue">function</span>{" "}
					<span className="ol-code-white">App</span>() {"{"}
					{"\n  "}
					<span className="ol-code-purple">return</span> (
					{"\n    "}
					<span className="ol-code-blue">{"<SupportWidget"}</span>
					{"\n      "}
					<span className="ol-code-white">publicKey</span>=
					<span className="ol-code-green">{"\"pk_live_otto\""}</span>
					{"\n      "}
					<span className="ol-code-white">user</span>=
					<span className="ol-code-purple">{"{{ id: user.id }}"}</span>
					{"\n    "}
					<span className="ol-code-blue">{"/>"}</span>
					{"\n  "});
					{"\n}"}
				</code>
			</pre>
			<div className="ol-code-command"><span>$</span><code>npm install @otto/next</code><b>Copied</b></div>
		</div>
	);
}

function IntegrationsGraphic() {
	const tools = ["STRIPE", "LINEAR", "SLACK", "CAL", "API", "WEBHOOK"];
	return (
		<div className="ol-integrations-graphic">
			<div className="ol-integration-lines" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
			<span className="ol-integration-core"><OttoMascot /></span>
			{tools.map((tool, index) => (
				<span className={`ol-tool ol-tool-${index + 1}`} key={tool}>{tool}</span>
			))}
		</div>
	);
}

function PromptGraphic() {
	return (
		<div className="ol-prompt-graphic">
			<header><span>System prompt</span><b>Live</b></header>
			<p>You are Otto, a calm and capable support teammate.</p>
			<p><span>01</span> Use approved knowledge before answering.</p>
			<p><span>02</span> Explain actions before requesting approval.</p>
			<p><span>03</span> Never invent account or product details.</p>
			<p><span>04</span> Escalate when confidence is low.</p>
			<footer><span>Last updated 12m ago</span><b>Saved</b></footer>
		</div>
	);
}

function Header() {
	return (
		<header className="ol-header">
			<Link aria-label="Otto home" className="ol-logo" href="/">
				<OttoMark />
				<span>Otto</span>
			</Link>
			<nav aria-label="Main navigation" className="ol-desktop-nav">
				<a href="#product">Product</a>
				<Link href="/pricing">Pricing</Link>
				<Link href="/changelog">Changelog</Link>
				<a href="#trust">Trust</a>
			</nav>
			<Link className="ol-header-cta" href="/pricing">Meet Otto</Link>
			<details className="ol-mobile-menu">
				<summary aria-label="Open navigation"><i /><i /></summary>
				<nav aria-label="Mobile navigation">
					<a href="#product">Product</a>
					<Link href="/pricing">Pricing</Link>
					<Link href="/changelog">Changelog</Link>
					<a href="#trust">Trust</a>
				</nav>
			</details>
		</header>
	);
}

export function MirageLanding() {
	return (
		<main className="otto-mirage">
			<Header />

			<div className="ol-frame">
				<section className="ol-hero" id="top">
					<PixelField />
					<div className="ol-hero-copy">
						<a className="ol-release-pill" href="#updates">
							<span>NEW</span>
							Meet Otto: action-ready support
						</a>
						<h1>Get agentic AI to work on your workflows</h1>
						<p>Automate routine support and focus on what matters most. Less friction, more flow.</p>
						<a className="ol-primary-button" href="#product">Get started</a>
					</div>
				</section>

				<section aria-label="Customer logos" className="ol-logo-rail">
					<div className="ol-logo-list">
						{customerLogos.map((logo) => <span key={logo}>{logo}</span>)}
					</div>
					<p>Powering support inside ambitious product teams.</p>
				</section>

				<div aria-hidden="true" className="ol-hatch-divider" />

				<section className="ol-two-up" id="product">
					<article className="ol-feature-card">
						<div className="ol-card-copy">
							<p className="ol-eyebrow"><span className="ol-feature-icon">K</span>Adaptive knowledge</p>
							<h2>Answers that improve with every conversation.</h2>
							<p>Otto keeps product knowledge current and cites the source behind every answer.</p>
						</div>
						<KnowledgeGraphic />
					</article>
					<article className="ol-feature-card">
						<div className="ol-card-copy">
							<p className="ol-eyebrow"><span className="ol-feature-icon">+</span>One-line install</p>
							<h2>Embed an action-ready agent.</h2>
							<p>Ship Otto in one shadow root and make it feel native to the product you already have.</p>
						</div>
						<InstallGraphic />
					</article>
				</section>

				<section className="ol-statement">
					<p>[ Built for product support ]</p>
					<h2>Support that moves<br />work forward.</h2>
				</section>

				<section className="ol-product-section" aria-labelledby="product-demo-title">
					<div className="ol-section-heading">
						<p>01 / IN-PRODUCT SUPPORT</p>
						<h2 id="product-demo-title">One conversation.<br />The whole workflow.</h2>
						<span>Otto works inside your interface, with the context and controls customers need to finish safely.</span>
					</div>
					<ProductWindow />
				</section>

				<section className="ol-bento" aria-label="Product capabilities">
					<article className="ol-bento-card ol-bento-integrations">
						<div className="ol-card-copy">
							<p className="ol-eyebrow">Connected tools</p>
							<h3>Actions across the stack.</h3>
							<p>Use built-in tools or connect your own APIs without rebuilding the support experience.</p>
						</div>
						<IntegrationsGraphic />
					</article>
					<article className="ol-bento-card ol-bento-prompt">
						<div className="ol-card-copy">
							<p className="ol-eyebrow">Your rules</p>
							<h3>Control the agent, completely.</h3>
							<p>Set the model, voice, limits, and skills. Otto follows the system you define.</p>
						</div>
						<PromptGraphic />
					</article>
				</section>

				<section className="ol-trust-section" id="trust">
					<div className="ol-section-heading">
						<p>02 / TRUST MODEL</p>
						<h2>Built around trust.</h2>
						<span>Actions stay understandable, permissioned, stoppable, and recorded from request to completion.</span>
						<a className="ol-secondary-button" href="#trust-model">See the trust model</a>
					</div>
					<div className="ol-trust-grid" id="trust-model">
						<article className="ol-trust-visual">
							<div className="ol-trust-orbit" aria-hidden="true">
								<i className="orbit-one" /><i className="orbit-two" /><i className="orbit-three" />
								<span><OttoMascot /></span>
							</div>
							<div className="ol-trust-checks">
								<span><i /> Request understood</span>
								<span><i /> Action explained</span>
								<span><i /> Customer approved</span>
								<span><i /> Audit event saved</span>
							</div>
						</article>
						<div className="ol-trust-stats">
							<article>
								<strong>1 click</strong>
								<h3>Approval before sensitive actions</h3>
								<p>Customers always know what Otto wants to change and why.</p>
							</article>
							<article>
								<strong>Always</strong>
								<h3>Stoppable while Otto is acting</h3>
								<p>A visible stop control keeps the customer in charge of the workflow.</p>
							</article>
						</div>
					</div>
				</section>

				<section className="ol-workflow-section">
					<div className="ol-section-heading">
						<p>03 / HOW OTTO GETS WORK DONE</p>
						<h2>From question to done.</h2>
						<span>No black box. Every step stays visible to the customer and your team.</span>
					</div>
					<div className="ol-workflow-grid">
						{workflowSteps.map((step) => (
							<article key={step.index}>
								<header><span>{step.index}</span><i /></header>
								<div className="ol-workflow-terminal">
									<span>{step.status}</span>
									<i /><i /><i />
								</div>
								<h3>{step.title}</h3>
								<p>{step.copy}</p>
							</article>
						))}
					</div>
				</section>

				<section className="ol-outcomes">
					<div className="ol-section-heading">
						<p>04 / SUPPORT OUTCOMES</p>
						<h2>Wake up to zero<br />support tickets.</h2>
						<span>Otto keeps customers moving while your team focuses on the work that actually needs people.</span>
					</div>
					<div className="ol-outcome-grid">
						<article><strong>24/7</strong><p>In-product support coverage</p></article>
						<article><strong>3x</strong><p>Faster resolution for routine work</p></article>
						<article><strong>100%</strong><p>Visible approval on sensitive actions</p></article>
					</div>
				</section>

				<section className="ol-updates" id="updates">
					<header>
						<div><p>PRODUCT UPDATES</p><h2>We ship, a lot.</h2></div>
						<Link href="/changelog">View all changelogs</Link>
					</header>
					<div className="ol-update-list">
						{updates.map(([date, title, copy]) => (
							<Link href="/changelog" key={title}>
								<span>{date}</span>
								<strong>{title}</strong>
								<p>{copy}</p>
								<b aria-hidden="true">-&gt;</b>
							</Link>
						))}
					</div>
				</section>

				<section className="ol-final-cta">
					<PixelField />
					<div>
						<span><OttoMascot /></span>
						<p>[ START IN MINUTES ]</p>
						<h2>Put Otto to work<br />inside your product.</h2>
						<Link className="ol-primary-button" href="/pricing">Meet Otto</Link>
					</div>
				</section>

				<footer className="ol-footer">
					<div className="ol-footer-brand">
						<OttoMark />
						<strong>Otto</strong>
					</div>
					<nav aria-label="Footer navigation">
						<Link href="/pricing">Pricing</Link>
						<Link href="/changelog">Changelog</Link>
						<a href="#product">Product</a>
						<a href="mailto:hello@otto.ai">Contact</a>
					</nav>
					<div className="ol-footer-meta">
						<a href="mailto:hello@otto.ai">hello@otto.ai</a>
						<span>(c) 2026 Otto</span>
					</div>
				</footer>
			</div>

			<SupportWidget />
		</main>
	);
}
