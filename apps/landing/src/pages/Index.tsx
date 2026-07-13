import {
	ArrowRight,
	Check,
	ChevronRight,
	CircleCheck,
	Clock3,
	Code2,
	LockKeyhole,
	Menu,
	MousePointer2,
	ShieldCheck,
	Sparkles,
	X,
} from "lucide-react";
import { useState } from "react";

const customers = ["Northstar", "Landmark", "Strata", "Morrow", "Kindred", "Circuit"];

const capabilities = [
	["Intent resolution", "Turn a Jira request into a precise, explainable destination."],
	["Jira Automation delivery", "Send the right handoff directly from your existing workflow."],
	["Email-correlated handoffs", "Match the guidance card to the customer who asked for help."],
	["Approval gates", "Every click waits for a visible customer decision."],
	["Highlight-only protection", "Keep high-risk controls informative, never automatic."],
	["Completion audits", "Record the route, consent, and outcome of each handoff."],
	["Link fallback", "Offer an exact deep link if the in-browser handoff expires."],
	["SDK integration", "Add a small, framework-friendly layer to your product."],
];

const testimonials = [
	{
		initials: "NP",
		name: "Nadia Patel",
		role: "Head of Support, Northstar",
		quote: "Our best support answers used to die in Jira. Now they arrive in the product, exactly when a customer needs them.",
	},
	{
		initials: "JL",
		name: "Jon Lee",
		role: "Product Operations, Circuit",
		quote: "The approval card changed the conversation with security. The guide can be helpful without quietly taking control.",
	},
	{
		initials: "MF",
		name: "Maya Flores",
		role: "CX Lead, Morrow",
		quote: "Customers stop bouncing between a help article and the app. They can see the setting, understand it, and finish the job.",
	},
];

function Mark() {
	return <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>;
}

function BrowserMockup({ compact = false }: { compact?: boolean }) {
	const [allowed, setAllowed] = useState(false);
	return (
		<div className={`browser-mockup ${compact ? "browser-mockup--compact" : ""}`}>
			<div className="browser-bar">
				<div className="browser-dots"><i /><i /><i /></div>
				<div className="browser-url"><LockKeyhole size={11} /> app.northstar.io/settings/security</div>
			</div>
			<div className="browser-body">
				<aside className="browser-sidebar">
					<Mark />
					<span className="side-line active" />
					<span className="side-line" /><span className="side-line" /><span className="side-line" />
				</aside>
				<div className="settings-screen">
					<div className="settings-kicker">Account settings</div>
					<div className="settings-title">Security</div>
					<div className="settings-tabs"><span>Profile</span><span className="selected">Security</span><span>Access</span></div>
					<div className={`setting-row ${allowed ? "setting-row--complete" : ""}`}>
						<div><strong>Two-factor authentication</strong><small>Add an extra layer of protection</small></div>
						<button className="toggle" aria-label="Two-factor authentication"><i /></button>
					</div>
					<div className="setting-row dim"><div><strong>Trusted devices</strong><small>Manage active sessions</small></div><ChevronRight size={16} /></div>
				</div>
				<div className={`handoff-card ${allowed ? "handoff-card--allowed" : ""}`}>
					<div className="handoff-top"><span><Sparkles size={14} /> Guided support</span><span className="pending-dot" /></div>
					<p>{allowed ? "Two-factor authentication is ready to configure." : "Support found Two-factor authentication. Want me to show you?"}</p>
					{allowed ? <div className="handoff-success"><CircleCheck size={15} /> Guidance started</div> : <div className="handoff-actions"><button className="dismiss" onClick={() => setAllowed(false)}>Dismiss</button><button className="allow" onClick={() => setAllowed(true)}>Allow <ArrowRight size={14} /></button></div>}
				</div>
			</div>
		</div>
	);
}

function JiraMockup() {
	return <div className="jira-mockup"><div className="jira-top"><span className="jira-logo">J</span><strong>Support queue</strong><span className="jira-live"><i /> Connected</span></div><div className="jira-content"><div className="jira-issue"><span className="issue-id">SUP-241</span><b>Customer can’t find two-factor authentication</b><p>"Where do I enable 2FA for my account?"</p><div className="jira-person"><span>AR</span> Avery Rogers · customer</div></div><div className="jira-automation"><div><Sparkles size={14} /><b>Handoff prepared</b></div><p>Matched Security → Two-factor authentication</p><span>Delivery pending · expires in 15 min</span></div></div></div>}

function AuditMockup() {
	return <div className="audit-mockup"><div className="audit-head"><div><span className="eyebrow">Handoff activity</span><b>Today, 24 Jun</b></div><span className="live-pill"><i /> Live</span></div>{[["02:41 PM", "Handoff delivered", "jordan@northstar.com"], ["02:41 PM", "Customer approved", "Security → 2FA"], ["02:42 PM", "Target highlighted", "No action performed"], ["02:43 PM", "Completed", "Guidance dismissed"]].map(([time, title, detail], index) => <div className="audit-line" key={title}><span className="audit-node">{index < 3 ? <Check size={11} /> : <Clock3 size={11} />}</span><span className="audit-time">{time}</span><div><b>{title}</b><small>{detail}</small></div></div>)}</div>;
}

const Index = () => {
	const [menuOpen, setMenuOpen] = useState(false);
	return <main>
		<header className="site-header">
			<a className="brand" href="#top" aria-label="GuideLayer home"><Mark /><span>GuideLayer</span></a>
			<nav className={menuOpen ? "nav-links nav-links--open" : "nav-links"} aria-label="Main navigation">
				<a href="#product" onClick={() => setMenuOpen(false)}>Product</a><a href="#safety" onClick={() => setMenuOpen(false)}>Safety</a><a href="#customers" onClick={() => setMenuOpen(false)}>Customers</a><a href="#changelog" onClick={() => setMenuOpen(false)}>Changelog</a><a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
			</nav>
			<a className="header-cta" href="#contact">Book a demo <ArrowRight size={15} /></a>
			<button className="menu-toggle" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
		</header>

		<section className="hero-shell section-rule" id="top">
			<div className="hero-noise" aria-hidden="true" />
			<div className="hero-copy">
				<a className="announcement" href="#changelog"><span>NEW</span><b>Seamless support handoffs</b><ArrowRight size={13} /></a>
				<h1>Turn support answers into <em>guided actions.</em></h1>
				<p>Jira captures the request. Your backend resolves intent. Customers approve a safe guided action in the browser tab they’re already using.</p>
				<div className="hero-buttons"><a className="button button--light" href="#contact">Get started <ArrowRight size={16} /></a><a className="button button--ghost" href="#product">See how it works <ChevronRight size={16} /></a></div>
			</div>
			<div className="hero-stage"><div className="hero-orbit hero-orbit--one" /><div className="hero-orbit hero-orbit--two" /><div className="hero-jira"><JiraMockup /></div><BrowserMockup /></div>
			<div className="trust-strip"><p>Turn Jira support answers into safe in-browser guidance.</p><div className="marquee"><div>{customers.concat(customers).map((customer, index) => <span key={`${customer}-${index}`}>{customer}</span>)}</div></div></div>
		</section>

		<section className="intro-section"><p className="eyebrow">Support guidance, rethought</p><h2>Give customers a way forward,<br /><em>not another dead end.</em></h2><p className="intro-copy">GuideLayer turns the answer your team already has into a moment of useful, consent-first help in your product.</p></section>

		<section id="product" className="feature-pair section-rule"><article className="feature-card feature-card--delivery"><div className="card-copy"><span className="eyebrow">01 — DELIVERY</span><h3>Support that reaches customers in the right moment.</h3><p>Create a short-lived handoff from Jira Automation. It appears only for the customer who asked, directly inside their product session.</p><a href="#contact" className="text-link">Explore delivery <ArrowRight size={15} /></a></div><JiraMockup /></article><article className="feature-card feature-card--safe"><div className="card-copy"><span className="eyebrow">02 — SAFETY</span><h3>Safe by default,<br />every time.</h3><p>Every guide shows the destination, explains the next step, and waits for explicit approval. Sensitive controls stay highlight-only.</p><div className="safety-list"><span><Check size={14} /> Consent before action</span><span><Check size={14} /> Audit-ready events</span><span><Check size={14} /> Fallback deep links</span></div></div><div className="safe-visual"><div className="safety-ring" /><div className="approval-note"><ShieldCheck size={17} /><b>Approval required</b><small>Customer is in control</small></div><div className="target-dot"><MousePointer2 size={16} /></div></div></article></section>

		<section id="customers" className="proof-section section-rule"><div className="section-heading"><div><p className="eyebrow">TRUSTED TEAMS</p><h2>Support that customers<br /><em>actually feel.</em></h2></div><p>Built for teams who want their support answers to carry through, without compromising the boundary between assistance and control.</p></div><div className="quote-rail">{testimonials.concat(testimonials).map((item, index) => <article className="quote-card" key={`${item.name}-${index}`}><div className="quote-card__top"><span className="avatar">{item.initials}</span><div><b>{item.name}</b><small>{item.role}</small></div></div><p>“{item.quote}”</p><span className="quote-mark">✳</span></article>)}</div></section>

		<section className="product-sequence">
			<article className="sequence-row"><div className="sequence-copy"><span className="eyebrow">OBSERVABILITY</span><h2>Track every handoff<br /><em>in real time.</em></h2><p>Know when guidance was delivered, approved, opened, completed, or expired — without turning your support system into a browser controller.</p><a href="#contact" className="text-link">See the audit trail <ArrowRight size={15} /></a></div><AuditMockup /></article>
			<article className="sequence-row sequence-row--reverse"><div className="sequence-copy"><span className="eyebrow">IN CONTEXT</span><h2>Guide customers without sending them to a new tab.</h2><p>The SDK opens the correct route in their existing app and makes the target easy to recognize — no videos, screenshots, or copy-pasted instructions.</p></div><BrowserMockup compact /></article>
			<article className="sequence-row"><div className="sequence-copy"><span className="eyebrow">CONSENT LAYER</span><h2>Keep clicks<br /><em>approval-gated.</em></h2><p>Customers choose whether to start guidance. For higher-risk destinations, GuideLayer highlights the control and leaves every click to them.</p></div><div className="consent-visual"><div className="consent-page"><div className="tiny-nav"><i /><i /><i /></div><span className="page-eyebrow">Workspace</span><b>Delete workspace</b><p>Deleting a workspace removes access for everyone.</p><button disabled>Delete workspace</button></div><div className="warning-card"><span><ShieldCheck size={15} /> High-risk control</span><p>GuideLayer can point here, but won’t click this button.</p><div><button>Got it</button><button>View policy</button></div></div></div></article>
			<article className="sequence-row sequence-row--reverse"><div className="sequence-copy"><span className="eyebrow">CLEAR BOUNDARIES</span><h2>Use Jira as the support surface, <em>not the browser controller.</em></h2><p>Automations can create and deliver a handoff. The customer’s browser makes the final decision, with transparent, expiring context.</p></div><div className="flow-visual"><div className="flow-card flow-card--jira"><span className="jira-logo">J</span><div><b>Jira automation</b><small>Issue resolved to handoff</small></div></div><div className="flow-line"><i /><span>Signed handoff</span></div><div className="flow-card flow-card--browser"><Mark /><div><b>Customer browser</b><small>Approval gate appears</small></div></div></div></article>
		</section>

		<section id="safety" className="capabilities section-rule"><div className="capabilities__header"><p className="eyebrow">THE GUIDELAYER SYSTEM</p><h2>Careful help,<br /><em>built in.</em></h2><p>Every capability is designed to make support less repetitive while keeping customers aware, informed, and in control.</p></div><div className="capability-grid">{capabilities.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><div className="capability-icon">{index % 3 === 0 ? <Sparkles /> : index % 3 === 1 ? <ShieldCheck /> : <Code2 />}</div><h3>{title}</h3><p>{body}</p><ArrowRight className="capability-arrow" size={16} /></article>)}</div></section>

		<section className="metrics-section"><p className="eyebrow">THE RIGHT KIND OF FAST</p><div className="metrics-grid"><article><b>&lt;5<span> sec</span></b><p>pending handoff delivery</p><div className="metric-line"><i /><i /><i /><i /></div></article><article><b>100<span>%</span></b><p>approval-gated actions</p><div className="metric-check"><Check /><Check /><Check /></div></article><article><b>15<span> min</span></b><p>handoff token expiry</p><div className="metric-clock"><Clock3 /></div></article></div></section>

		<section className="reviews-section"><div className="section-heading"><div><p className="eyebrow">CUSTOMER NOTES</p><h2>More useful support.<br /><em>Fewer loops.</em></h2></div><a href="#contact" className="button button--dark">Meet the teams <ArrowRight size={15} /></a></div><div className="review-grid">{testimonials.map((item) => <article key={item.name}><div className="quote-card__top"><span className="avatar">{item.initials}</span><div><b>{item.name}</b><small>{item.role}</small></div></div><p>“{item.quote}”</p><div className="review-stars">★★★★★</div></article>)}</div></section>

		<section id="changelog" className="changelog-section section-rule"><div className="section-heading"><div><p className="eyebrow">WHAT’S NEW</p><h2>We ship,<br /><em>carefully.</em></h2></div><a href="#contact" className="text-link">View all updates <ArrowRight size={15} /></a></div><div className="changelog-list">{[["06.24.26", "Seamless support handoffs", "Delivery"], ["06.10.26", "Approval-gated browser guidance", "Safety"], ["05.28.26", "Jira Automation fallback links", "Integrations"]].map(([date, title, tag], index) => <a href="#contact" key={title} className="change-row"><span className={`change-art change-art--${index}`}><i /><i /><i /></span><time>{date}</time><b>{title}</b><span className="change-tag">{tag}</span><ArrowRight size={17} /></a>)}</div></section>

		<section id="pricing" className="final-cta"><div className="final-grid" aria-hidden="true" /><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Make every support<br />answer <em>useful.</em></h2><p>Give your customers a clear, safe path from “where is it?” to “I’ve got it.”</p><a className="button button--light" href="#contact">Get started <ArrowRight size={16} /></a></div></section>

		<footer id="contact" className="site-footer"><div className="footer-top"><div><a className="brand" href="#top"><Mark /><span>GuideLayer</span></a><p>Safe in-browser guidance for the support answers your team already knows.</p></div><div className="footer-columns"><div><b>Product</b><a href="#product">How it works</a><a href="#safety">Safety</a><a href="#pricing">Pricing</a></div><div><b>Company</b><a href="#customers">Customers</a><a href="#changelog">Changelog</a><a href="mailto:hello@guidelayer.app">Contact</a></div><div><b>Stay in the loop</b><a href="mailto:hello@guidelayer.app">hello@guidelayer.app</a><a href="#top">LinkedIn ↗</a></div></div></div><div className="footer-bottom"><span>© 2026 GuideLayer</span><span>Built for consent-first support.</span><span>Privacy · Terms</span></div><div className="footer-wordmark">GUIDELAYER</div></footer>
	</main>
};

export default Index;
