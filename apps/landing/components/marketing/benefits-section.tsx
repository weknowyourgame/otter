import type { CSSProperties } from "react";
import { OtterMark } from "./logo";

const knowledgeCards = [
	["SSO Configuration", "Configure Single Sign-On with Google and Microsoft", "Updated 2 hours ago"],
	["API Integration Setup", "Connect your app with REST APIs and webhooks", "Updated 1 day ago"],
	["How to upgrade my plan?", "Step-by-step guide to unlock premium features", "Auto-updated 3 days ago by AI"],
];

function KnowledgeGraphic() {
	return (
		<div className="mk-knowledge-graphic">
			{knowledgeCards.map(([title, description, date], index) => (
				<div className="mk-knowledge-card" key={title} style={{ "--card-index": index } as CSSProperties}>
					<strong>{title}</strong>
					<span>{description}</span>
					<small>{date}</small>
				</div>
			))}
		</div>
	);
}

function ToolsGraphic() {
	return (
		<div className="mk-tools-graphic">
			<span className="mk-tool-node mk-tool-linear">LINEAR</span>
			<span className="mk-tool-node mk-tool-api">API</span>
			<span className="mk-tool-node mk-tool-cal">CAL</span>
			<span className="mk-tool-node mk-tool-stripe">STRIPE</span>
			<span className="mk-tool-node mk-tool-webhook">WEB<br />HOOK</span>
			<span className="mk-tool-core"><OtterMark /></span>
			<span className="mk-tool-agent">✦</span>
			<i className="mk-beam mk-beam-a" /><i className="mk-beam mk-beam-b" /><i className="mk-beam mk-beam-c" /><i className="mk-beam mk-beam-d" />
		</div>
	);
}

function PromptGraphic() {
	return (
		<div className="mk-prompt-graphic" aria-label="Agent prompt example">
			<div className="mk-prompt-scroll">
				<p>You are a friendly and professional support agent for Acme SaaS.</p>
				<p>Always maintain a helpful, empathetic tone while being concise.</p>
				<p>Prioritize solving customer problems quickly and efficiently.</p>
				<p className="mk-prompt-heading">## Rules</p>
				<p>- If you do not know the answer, escalate to human support.</p>
				<p>- NEVER make up information or provide guesses.</p>
				<p>- Ask for confirmation before sensitive actions.</p>
			</div>
		</div>
	);
}

const benefits = [
	{
		title: "Self-learning knowledge base",
		description: "Otter crawls your docs, resources and conversations to auto-build FAQs, improving answers as your product and support evolves.",
		graphic: <KnowledgeGraphic />,
	},
	{
		title: "Default & Custom tools",
		description: "Out-of-the-box tools can log tickets, check subscriptions and book calls, plus you can wire up your own APIs for custom actions.",
		graphic: <ToolsGraphic />,
	},
	{
		title: "Control prompt & skills",
		description: "Set the model, prompt, personality and skills of your agent. Make it formal, funny, or straight to the point - you are in charge.",
		graphic: <PromptGraphic />,
	},
];

export function BenefitsSection() {
	return (
		<section className="mk-benefits" id="benefits">
			<header className="mk-benefits-heading">
				<p className="mk-kicker">[Support your customers faster with your own AI agent]</p>
				<h2>Wake up to zero support tickets, your custom<br />AI agent keeps your users happy while you sleep.</h2>
			</header>
			<div className="mk-benefits-grid">
				{benefits.map((benefit) => (
					<article className="mk-benefit" key={benefit.title}>
						<div className="mk-benefit-graphic">{benefit.graphic}</div>
						<h3>{benefit.title}</h3>
						<p>{benefit.description}</p>
					</article>
				))}
			</div>
		</section>
	);
}
