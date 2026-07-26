import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
	title: "Pricing - Otter",
	description: "Simple plans for teams adding AI-native support to their product.",
};

const features = [
	["Conversations", "20 / rolling 30 days", "Unlimited", "Unlimited"],
	["Messages", "200 / rolling 30 days", "Unlimited", "Unlimited"],
	["Contacts", "25", "2,000", "6,000"],
	["Conversation retention", "30 days", "Unlimited", "Unlimited"],
	["Team members", "1 seat", "2 seats", "4 seats"],
	["Email notifications", "✓", "✓", "✓"],
	["Dashboard file sharing", "—", "✓", "✓"],
	["Auto translate", "—", "—", "✓"],
	["AI credits", "50 / month", "1,000 / month", "3,000 / month"],
	["Latest AI models", "—", "✓", "✓"],
	["Custom AI skills", "✓", "✓", "✓"],
	["Custom agent avatar", "—", "—", "✓"],
	["Training links", "5", "Unlimited", "Unlimited"],
	["REST API", "✓", "✓", "✓"],
	["Self-host", "✓", "✓", "✓"],
];

const plans = [
	{ name: "Free", price: "$0", oldPrice: "", description: "Perfect for getting started", recommended: false },
	{ name: "Hobby", price: "$20", oldPrice: "$30", description: "For growing teams", recommended: false },
	{ name: "Pro", price: "$40", oldPrice: "$90", description: "For teams with advanced needs", recommended: true },
];

const faqs = [
	["Can I self-host Otter?", "Yes. Otter is designed so the support interface and your data can run on your own infrastructure."],
	["Do you offer anything for open source projects?", "Yes. Eligible open source projects can use the Pro plan at no cost."],
	["Do you offer annual billing?", "Monthly billing is available now. Annual billing will be added once the plan catalog is finalized."],
	["How long does launch pricing apply?", "The promotional rate remains active for the lifetime of an uninterrupted subscription."],
	["When do usage limits reset?", "Message and conversation limits use a rolling 30-day window."],
	["What happens if I exceed my limits?", "Otter warns you before the limit and keeps existing conversations available while you upgrade."],
];

export default function PricingPage() {
	return (
		<MarketingShell>
			<section className="mk-pricing-hero">
				<p className="mk-kicker">[Simple, transparent pricing]</p>
				<h1>Pricing</h1>
				<p>Integrate for free and scale as you grow.</p>
				<div className="mk-promo-line">Limited launch offer - up to <strong>55% off</strong> for the lifetime of your subscription</div>
			</section>
			<section className="mk-pricing-grid" aria-label="Pricing comparison">
				<div className="mk-feature-column">
					<div className="mk-plan-spacer" />
					{features.map(([name]) => <div className="mk-price-feature-name" key={name}>{name}</div>)}
				</div>
				{plans.map((plan, planIndex) => (
					<article className="mk-price-plan" data-recommended={plan.recommended ? "true" : "false"} key={plan.name}>
						<header>
							<div><h2>{plan.name}</h2>{plan.recommended && <span>Recommended</span>}</div>
							<p>{plan.description}</p>
							<div className="mk-plan-price"><strong>{plan.price}</strong>{plan.oldPrice && <del>{plan.oldPrice}</del>}<span>/month</span></div>
						</header>
						<div className="mk-plan-features">
							{features.map(([name, ...values]) => (
								<div key={name}><span>{name}</span><strong>{values[planIndex]}</strong></div>
							))}
						</div>
						<Link className="mk-button mk-button-outline" href="/demo">Get started</Link>
					</article>
				))}
			</section>
			<section className="mk-faqs">
				<p className="mk-kicker">[Questions, answered]</p>
				<h2>Frequently Asked Questions</h2>
				<div>
					{faqs.map(([question, answer]) => (
						<details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>
					))}
				</div>
			</section>
		</MarketingShell>
	);
}
