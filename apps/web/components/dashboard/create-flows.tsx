"use client";

import {
	ArrowLeft,
	ArrowRight,
	Bot,
	Check,
	CheckCircle2,
	Code2,
	Globe2,
	LoaderCircle,
	Sparkles,
	TerminalSquare,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { OtterGlyph } from "@/components/marks";
import {
	Button,
	CopyButton,
	cx,
	Field,
	SelectField,
	SettingToggle,
	TextAreaField,
} from "./ui";

function FlowShell({
	eyebrow,
	title,
	description,
	step,
	total,
	children,
}: {
	eyebrow: string;
	title: string;
	description: string;
	step: number;
	total: number;
	children: ReactNode;
}) {
	return (
		<div className="od-flow">
			<header className="od-flow__topbar">
				<Link aria-label="Otter dashboard" href="/dashboard">
					<span>
						<OtterGlyph className="h-4 w-4" />
					</span>
					<strong>Otter</strong>
				</Link>
				<Link href="/dashboard">
					<ArrowLeft size={15} /> Back to dashboard
				</Link>
			</header>
			<div className="od-flow__grid">
				<aside className="od-flow__aside">
					<div>
						<span>{eyebrow}</span>
						<h1>{title}</h1>
						<p>{description}</p>
					</div>
					<div className="od-flow__progress">
						<span>
							Step {step} of {total}
						</span>
						<div>
							{Array.from({ length: total }, (_, index) => index + 1).map(
								(position) => (
									<i
										className={position <= step ? "is-active" : ""}
										key={`flow-step-${position}`}
									/>
								),
							)}
						</div>
					</div>
				</aside>
				<main className="od-flow__main">{children}</main>
			</div>
		</div>
	);
}

export function OrganizationCreateFlow() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");

	async function submit(event: FormEvent) {
		event.preventDefault();
		if (!name.trim()) return;
		setSubmitting(true);
		setError("");
		const response = await fetch("/api/account/organization", {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: name.trim() }),
		});
		setSubmitting(false);
		if (!response.ok) {
			setError("Could not save that name. Try again.");
			return;
		}
		router.push("/websites/create");
	}

	return (
		<FlowShell
			description="Every signup already has a workspace — this just names it."
			eyebrow="New workspace"
			step={1}
			title="Name your organization."
			total={1}
		>
			<form className="od-flow-card" onSubmit={(event) => void submit(event)}>
				<div className="od-flow-card__head">
					<span>
						<Users size={19} />
					</span>
					<div>
						<h2>Organization details</h2>
						<p>You can invite teammates after the first website is ready.</p>
					</div>
				</div>
				<div className="od-flow-card__body">
					<Field
						autoFocus
						label="Organization name"
						onChange={(event) => setName(event.target.value)}
						placeholder="Acme, Inc."
						value={name}
					/>
					{error ? <p className="od-auth-error">{error}</p> : null}
				</div>
				<div className="od-flow-card__footer">
					<Link href="/org">Cancel</Link>
					<Button
						disabled={!name.trim() || submitting}
						type="submit"
						variant="primary"
					>
						{submitting ? "Saving…" : "Save organization"}{" "}
						<ArrowRight size={15} />
					</Button>
				</div>
			</form>
		</FlowShell>
	);
}

function buildInstallPrompt(publicKey: string): string {
	return `Add Otter support to this Next.js application.

1. Install otter-sdk with your existing package manager.
2. Wrap the root layout with OtterProvider.
3. Mount <OtterWidget /> once, near the end of the body.
4. Use this public key: ${publicKey}
5. Allow the domain configured for this website.

Keep the existing visual system unchanged and verify the widget opens on mobile.`;
}

export function WebsiteCreateFlow() {
	const [step, setStep] = useState(1);
	const [name, setName] = useState("");
	const [domain, setDomain] = useState("");
	const [framework, setFramework] = useState("Next.js");
	const [mode, setMode] = useState("ai");
	const [installKey, setInstallKey] = useState<string | null>(null);
	const [keyError, setKeyError] = useState("");

	useEffect(() => {
		if (step !== 2 || installKey) return;
		let active = true;
		fetch("/api/account/keys", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: `${name.trim() || "Website"} widget key`,
				type: "public",
				mode: "test",
			}),
		})
			.then(async (response) => {
				if (!response.ok) throw new Error();
				const body = (await response.json()) as { key: { rawKey: string } };
				if (active) setInstallKey(body.key.rawKey);
			})
			.catch(() => {
				if (active) setKeyError("Could not generate a key automatically.");
			});
		return () => {
			active = false;
		};
	}, [step, installKey, name]);

	const publicKeyDisplay = installKey ?? "Generating key…";
	const installPrompt = buildInstallPrompt(publicKeyDisplay);
	const [finishing, setFinishing] = useState(false);

	async function finishInstall() {
		setFinishing(true);
		try {
			await fetch("/api/account/keys", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: `${name.trim() || "Website"} live key`,
					type: "public",
					mode: "live",
				}),
			});
			if (domain.trim()) {
				const originsResponse = await fetch("/api/account/origins");
				const existing = originsResponse.ok
					? ((await originsResponse.json()) as { origins: string[] }).origins
					: [];
				const candidate = domain.trim().startsWith("http")
					? domain.trim()
					: `https://${domain.trim()}`;
				await fetch("/api/account/origins", {
					method: "PUT",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						origins: Array.from(new Set([...existing, candidate])),
					}),
				});
			}
		} finally {
			setFinishing(false);
			setStep(3);
		}
	}

	return (
		<FlowShell
			description="Create the site, choose a framework, then connect Otter with a generated key."
			eyebrow="Website setup"
			step={step}
			title={
				step === 1
					? "Where will Otter live?"
					: step === 2
						? "Install Otter locally."
						: "Your website is ready."
			}
			total={3}
		>
			{step === 1 ? (
				<form
					className="od-flow-card"
					onSubmit={(event) => {
						event.preventDefault();
						setStep(2);
					}}
				>
					<div className="od-flow-card__head">
						<span>
							<Globe2 size={19} />
						</span>
						<div>
							<h2>Create your website</h2>
							<p>
								This becomes the boundary for conversations, agent settings, and
								API keys.
							</p>
						</div>
					</div>
					<div className="od-flow-card__body">
						<Field
							autoFocus
							label="Website name"
							onChange={(event) => setName(event.target.value)}
							placeholder="Acme Docs"
							value={name}
						/>
						<Field
							hint="We will add this to your public-key allowlist."
							label="Production domain"
							onChange={(event) => setDomain(event.target.value)}
							placeholder="docs.acme.com"
							value={domain}
						/>
						<SelectField
							label="Framework"
							onChange={(event) => setFramework(event.target.value)}
							value={framework}
						>
							<option>Next.js</option>
							<option>React</option>
							<option>JavaScript</option>
						</SelectField>
					</div>
					<div className="od-flow-card__footer">
						<Link href="/org">Cancel</Link>
						<Button disabled={!name || !domain} type="submit" variant="primary">
							Create website <ArrowRight size={15} />
						</Button>
					</div>
				</form>
			) : null}
			{step === 2 ? (
				<div className="od-flow-card od-install-card">
					<div className="od-flow-card__head">
						<span>
							<TerminalSquare size={19} />
						</span>
						<div>
							<h2>Install Otter for {framework}</h2>
							<p>
								Use an AI coding assistant or follow the manual integration
								steps.
							</p>
						</div>
					</div>
					<div className="od-flow-card__body">
						<div className="od-mode-grid">
							<button
								className={mode === "ai" ? "is-active" : ""}
								onClick={() => setMode("ai")}
								type="button"
							>
								<Sparkles size={18} />
								<strong>Copy prompt for AI</strong>
								<p>
									Fastest. Paste one complete prompt into Codex or your editor.
								</p>
								<span>Recommended</span>
							</button>
							<button
								className={mode === "manual" ? "is-active" : ""}
								onClick={() => setMode("manual")}
								type="button"
							>
								<Code2 size={18} />
								<strong>Manual integration</strong>
								<p>Install the SDK and add the widget yourself.</p>
							</button>
						</div>
						{mode === "ai" ? (
							<div className="od-code-block">
								<div>
									<span>AI setup prompt</span>
									<CopyButton label="Copy setup prompt" value={installPrompt} />
								</div>
								<pre>{installPrompt}</pre>
							</div>
						) : (
							<div className="od-manual-steps">
								<div>
									<span>1</span>
									<div>
										<strong>Install the SDK</strong>
										<code>npm install otter-sdk</code>
									</div>
								</div>
								<div>
									<span>2</span>
									<div>
										<strong>Add your public key</strong>
										<code>{publicKeyDisplay}</code>
										{keyError ? <small>{keyError}</small> : null}
									</div>
								</div>
								<div>
									<span>3</span>
									<div>
										<strong>Mount the widget</strong>
										<code>{"<OtterWidget />"}</code>
									</div>
								</div>
							</div>
						)}
					</div>
					<div className="od-flow-card__footer">
						<Button onClick={() => setStep(1)}>Back</Button>
						<Button
							disabled={finishing}
							onClick={() => void finishInstall()}
							variant="primary"
						>
							{finishing ? "Finishing…" : "I installed Otter"}{" "}
							<Check size={15} />
						</Button>
					</div>
				</div>
			) : null}
			{step === 3 ? (
				<div className="od-flow-card od-flow-success">
					<div className="od-flow-card__body">
						<div className="od-success-mark">
							<CheckCircle2 size={27} />
						</div>
						<h2>{name} is connected.</h2>
						<p>
							We created test and live API keys, allowed {domain}, and prepared
							the workspace for its first agent.
						</p>
						<div className="od-created-facts">
							<div>
								<span>Website</span>
								<strong>{name}</strong>
							</div>
							<div>
								<span>Domain</span>
								<strong>{domain}</strong>
							</div>
							<div>
								<span>Framework</span>
								<strong>{framework}</strong>
							</div>
						</div>
					</div>
					<div className="od-flow-card__footer">
						<Link
							className="od-button od-button--secondary od-button--md"
							href="/settings/developers"
						>
							View API keys
						</Link>
						<Link
							className="od-button od-button--primary od-button--md"
							href="/agent/create"
						>
							Create AI agent <ArrowRight size={15} />
						</Link>
					</div>
				</div>
			) : null}
		</FlowShell>
	);
}

const goals = [
	"Answer product questions",
	"Troubleshoot issues",
	"Qualify leads",
	"Route to a human",
];
const generatedPrompt =
	"You are Otter Support, the thoughtful support teammate for Otter Labs. Answer clearly and directly using the knowledge base. Ask at most one focused clarification when necessary. Be warm without adding filler. Escalate account security, billing disputes, and requests where confidence is low.";

const modelIds: Record<string, string> = {
	"GPT-5.3 Codex": "openai/gpt-5.3-codex",
};

export function AgentCreateFlow() {
	const router = useRouter();
	const [step, setStep] = useState(1);
	const [name, setName] = useState("Otter Support");
	const [crawl, setCrawl] = useState(true);
	const [url, setUrl] = useState("https://otter.so");
	const [selectedGoals, setSelectedGoals] = useState([goals[0], goals[1]]);
	const [analysis, setAnalysis] = useState(0);
	const [tone, setTone] = useState("Warm & concise");
	const [model, setModel] = useState("GPT-5.3 Codex");
	const [prompt, setPrompt] = useState(generatedPrompt);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState("");

	const continueFromBasics = () => {
		setStep(2);
		if (!crawl) {
			setAnalysis(3);
			window.setTimeout(() => setStep(3), 350);
			return;
		}
		setAnalysis(1);
		window.setTimeout(() => setAnalysis(2), 850);
		window.setTimeout(() => setAnalysis(3), 1650);
		window.setTimeout(() => setStep(3), 2300);
	};

	async function finishAgentSetup() {
		setSaving(true);
		setSaveError("");
		try {
			const agentResponse = await fetch("/api/account/agent", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					model: modelIds[model] ?? model,
					systemPrompt: [
						prompt.trim(),
						selectedGoals.length
							? `Primary goals: ${selectedGoals.join(", ")}.`
							: "",
						crawl && url.trim()
							? `Use ${url.trim()} as an initial knowledge source.`
							: "",
					]
						.filter(Boolean)
						.join("\n\n"),
					maxToolCalls: 6,
					extendedReasoning: true,
					enabled: true,
					tonePreset: tone,
					voiceTone: tone,
					clarificationPolicy:
						"Ask one focused clarification only when the user's request cannot be completed safely from the current page.",
					escalationPolicy:
						"Escalate billing disputes, irreversible account actions, and security-sensitive changes that require an admin.",
					toolSettings: {
						click: true,
						fill: true,
						navigate: true,
						search_knowledge_base: true,
						remember: true,
					},
				}),
			});
			if (!agentResponse.ok) throw new Error("agent_save_failed");

			if (crawl && url.trim()) {
				const docsResponse = await fetch("/api/docs", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ url: url.trim() }),
				});
				if (!docsResponse.ok) throw new Error("crawl_enqueue_failed");
			}

			router.push("/agent");
		} catch {
			setSaveError(
				"Could not finish setup. Check the website URL and try again.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<FlowShell
			description="Give Otter a name, a goal, and enough context to feel like a member of your team."
			eyebrow="New AI teammate"
			step={step}
			title={
				step === 1
					? "Create your support agent."
					: step === 2
						? "Learning your product."
						: "Shape its personality."
			}
			total={3}
		>
			{step === 1 ? (
				<form
					className="od-flow-card"
					onSubmit={(event: FormEvent) => {
						event.preventDefault();
						continueFromBasics();
					}}
				>
					<div className="od-flow-card__head">
						<span>
							<Bot size={19} />
						</span>
						<div>
							<h2>Agent basics</h2>
							<p>Start with a clear job. You can tune every detail later.</p>
						</div>
					</div>
					<div className="od-flow-card__body">
						<Field
							autoFocus
							hint="Visible to your teammates and, optionally, visitors."
							label="Agent name"
							onChange={(event) => setName(event.target.value)}
							value={name}
						/>
						<div className="od-crawl-choice">
							<SettingToggle
								checked={crawl}
								description="Analyze your website to draft a personality and knowledge source."
								onChange={setCrawl}
								title="Crawl my website"
							/>
							{crawl ? (
								<Field
									hint="Free plan includes up to 25 discovered pages."
									label="Website URL"
									onChange={(event) => setUrl(event.target.value)}
									type="url"
									value={url}
								/>
							) : (
								<TextAreaField
									label="Describe your product"
									placeholder="What do you sell, and who do you help?"
									rows={4}
								/>
							)}
						</div>
						<div className="od-goal-picker">
							<span>What should this agent do?</span>
							<div>
								{goals.map((goal) => (
									<button
										className={selectedGoals.includes(goal) ? "is-active" : ""}
										key={goal}
										onClick={() =>
											setSelectedGoals((current) =>
												current.includes(goal)
													? current.filter((item) => item !== goal)
													: [...current, goal],
											)
										}
										type="button"
									>
										<i>
											{selectedGoals.includes(goal) ? (
												<Check size={12} />
											) : null}
										</i>
										{goal}
									</button>
								))}
							</div>
						</div>
					</div>
					<div className="od-flow-card__footer">
						<Link href="/dashboard">Cancel</Link>
						<Button
							disabled={
								!name.trim() || selectedGoals.length === 0 || (crawl && !url)
							}
							type="submit"
							variant="primary"
						>
							Continue <ArrowRight size={15} />
						</Button>
					</div>
				</form>
			) : null}
			{step === 2 ? (
				<div className="od-flow-card od-analysis-card">
					<div className="od-flow-card__head">
						<span>
							<Sparkles size={19} />
						</span>
						<div>
							<h2>Preparing {name}</h2>
							<p>
								Otter is gathering enough signal to draft a useful starting
								point.
							</p>
						</div>
					</div>
					<div className="od-flow-card__body">
						<div className="od-analysis-visual">
							<Globe2 size={26} />
							<div className="od-analysis-pulse" />
							<span>{url.replace(/^https?:\/\//, "")}</span>
						</div>
						<div className="od-analysis-steps">
							{[
								[
									1,
									"Crawling your website",
									"Reading linked pages and page structure",
								],
								[
									2,
									"Understanding your product",
									"Finding the audience, offer, and recurring terminology",
								],
								[
									3,
									"Crafting agent personality",
									"Turning those signals into a support-ready prompt",
								],
							].map(([index, title, description]) => (
								<div
									className={cx(
										analysis >= Number(index) && "is-active",
										analysis > Number(index) && "is-complete",
									)}
									key={title}
								>
									<span>
										{analysis > Number(index) ? (
											<Check size={13} />
										) : analysis === Number(index) ? (
											<LoaderCircle className="od-spin" size={13} />
										) : (
											index
										)}
									</span>
									<div>
										<strong>{title}</strong>
										<p>{description}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			) : null}
			{step === 3 ? (
				<div className="od-flow-card od-personality-card">
					<div className="od-flow-card__head">
						<span>
							<WandIcon />
						</span>
						<div>
							<h2>Agent personality</h2>
							<p>Review the generated behavior, model, and response style.</p>
						</div>
					</div>
					<div className="od-flow-card__body">
						<div className="od-agent-summary">
							<div className="od-agent-avatar">
								<Bot size={22} />
							</div>
							<div>
								<strong>{name}</strong>
								<p>
									{selectedGoals.length} goals ·{" "}
									{crawl ? "3 pages discovered" : "Manual context"}
								</p>
							</div>
							<span>Draft ready</span>
						</div>
						<div className="od-tone-picker">
							<span>Response style</span>
							<div>
								{["Concise", "Warm & concise", "Technical", "Playful"].map(
									(item) => (
										<button
											className={tone === item ? "is-active" : ""}
											key={item}
											onClick={() => setTone(item)}
											type="button"
										>
											{item}
										</button>
									),
								)}
							</div>
						</div>
						<SelectField
							label="AI model"
							onChange={(event) => setModel(event.target.value)}
							value={model}
						>
							<option>GPT-5.3 Codex</option>
						</SelectField>
						<TextAreaField
							hint="You can mention enabled tools using @tool-name after setup."
							label="System prompt"
							onChange={(event) => setPrompt(event.target.value)}
							rows={10}
							value={prompt}
						/>
						{saveError ? <p className="od-auth-error">{saveError}</p> : null}
					</div>
					<div className="od-flow-card__footer">
						<Button onClick={() => setStep(1)}>Edit basics</Button>
						<Button
							disabled={!prompt.trim() || saving}
							onClick={() => void finishAgentSetup()}
							variant="primary"
						>
							{saving ? (
								<>
									<LoaderCircle className="od-spin" size={14} /> Saving...
								</>
							) : (
								<>
									Finish setup <Check size={15} />
								</>
							)}
						</Button>
					</div>
				</div>
			) : null}
		</FlowShell>
	);
}

function WandIcon() {
	return <Sparkles size={19} />;
}
