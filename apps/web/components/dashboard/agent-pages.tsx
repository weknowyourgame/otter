"use client";

import {
	Bot,
	Check,
	ChevronDown,
	CircleHelp,
	FilePlus2,
	Files,
	Globe2,
	Plus,
	RefreshCw,
	Sparkles,
	Trash2,
} from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import {
	Button,
	EmptyState,
	Field,
	Modal,
	PageTitle,
	PanelFooter,
	SegmentedMeter,
	SelectField,
	SettingsSection,
	SettingToggle,
	TextAreaField,
	Toggle,
} from "./ui";
import { TrainingSummary, WorkspaceShell } from "./workspace-shell";

function AgentPageFrame({
	title,
	action,
	children,
}: {
	title: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<WorkspaceShell mode="agent">
			<div className="od-settings-page od-agent-settings">
				<PageTitle action={action}>{title}</PageTitle>
				<div className="od-settings-stack">{children}</div>
			</div>
		</WorkspaceShell>
	);
}

export function AgentGeneralPage() {
	const [enabled, setEnabled] = useState(true);
	const [thinking, setThinking] = useState(true);
	const [saved, setSaved] = useState(false);
	return (
		<AgentPageFrame
			action={
				<span className="od-agent-live">
					<i /> Agent live
				</span>
			}
			title="General"
		>
			<SettingsSection
				description="The identity and model visitors interact with in your widget."
				title="Agent configuration"
			>
				<div className="od-form-stack">
					<div className="od-agent-identity">
						<div className="od-agent-avatar">
							<Bot size={22} />
						</div>
						<div>
							<strong>Otto Support</strong>
							<p>AI teammate · Trained 4 minutes ago</p>
						</div>
						<Toggle
							checked={enabled}
							label="Enable Otto agent"
							onChange={setEnabled}
						/>
					</div>
					<Field defaultValue="Otto Support" label="Agent name" />
					<SelectField
						defaultValue="Claude 3.7 Sonnet"
						hint="Used for primary customer replies."
						label="AI model"
					>
						<option>Claude 3.7 Sonnet</option>
						<option>GPT-4.1 mini</option>
						<option>Gemini 2.5 Flash</option>
					</SelectField>
					<TextAreaField
						defaultValue="You are Otto, the calm and capable support teammate for Otto Labs. Give direct answers, use the knowledge base before asking questions, and hand off when confidence is low."
						hint="Use @tools to reference enabled capabilities."
						label="System prompt"
						rows={8}
					/>
				</div>
				<PanelFooter>
					<span className="od-save-note">
						{saved ? (
							<>
								<Check size={14} /> Saved
							</>
						) : (
							"8,000 characters remaining"
						)}
					</span>
					<Button
						onClick={() => {
							setSaved(true);
							window.setTimeout(() => setSaved(false), 1400);
						}}
						variant="primary"
					>
						Save agent
					</Button>
				</PanelFooter>
			</SettingsSection>
			<SettingsSection
				description="Let supported models spend more time reasoning before answering."
				title="AI thinking"
			>
				<SettingToggle
					checked={thinking}
					description="Recommended for technical support and multi-step troubleshooting."
					onChange={setThinking}
					title="Extended reasoning"
				/>
			</SettingsSection>
			<SettingsSection
				description="Cap how many tools the agent can use before it must answer or escalate."
				title="Tool invocation budget"
			>
				<div className="od-budget-row">
					<div>
						<strong>Maximum tool calls</strong>
						<p>Applied independently to every agent turn.</p>
					</div>
					<input
						aria-label="Maximum tool calls"
						defaultValue="6"
						max="12"
						min="1"
						type="number"
					/>
				</div>
			</SettingsSection>
		</AgentPageFrame>
	);
}

const behaviorPrompts = [
	{
		title: "Voice & tone",
		description: "How Otto should sound across every conversation.",
		value:
			"Be warm, concise, and confident. Use plain language. Match the visitor's technical depth without sounding robotic. Never pad an answer with generic acknowledgements.",
	},
	{
		title: "Clarification policy",
		description: "When the agent should ask a question before acting.",
		value:
			"Ask one focused clarification only when the missing detail changes the answer. Otherwise, state the assumption and help immediately.",
	},
	{
		title: "Escalation policy",
		description: "How to recognize and handle situations requiring a person.",
		value:
			"Escalate billing disputes, security incidents, account ownership changes, or requests where confidence is below 70%. Summarize what has already been tried.",
	},
];

export function AgentBehaviourPage() {
	const [tone, setTone] = useState("Balanced");
	return (
		<AgentPageFrame title="Behaviour">
			<div className="od-preset-strip">
				<span>Personality preset</span>
				{["Concise", "Balanced", "Warm", "Technical"].map((item) => (
					<button
						className={tone === item ? "is-active" : ""}
						key={item}
						onClick={() => setTone(item)}
						type="button"
					>
						{item}
					</button>
				))}
			</div>
			{behaviorPrompts.map((prompt) => (
				<SettingsSection
					description={prompt.description}
					key={prompt.title}
					title={prompt.title}
				>
					<div className="od-form-stack">
						<TextAreaField
							aria-label={prompt.title}
							defaultValue={prompt.value}
							label="Instructions"
							rows={7}
						/>
					</div>
					<PanelFooter>
						<Button>Reset</Button>
						<Button variant="primary">Save behavior</Button>
					</PanelFooter>
				</SettingsSection>
			))}
		</AgentPageFrame>
	);
}

const toolGroups = [
	{
		title: "Behavior tools",
		description:
			"Optional capabilities used while understanding and organizing conversations.",
		tools: [
			[
				"Request knowledge clarification",
				"Ask a private teammate question when the knowledge base is missing context.",
				true,
			],
			[
				"Update conversation title",
				"Keep each thread labeled with a concise, useful topic.",
				true,
			],
			[
				"Update sentiment",
				"Record meaningful sentiment changes for conversation analytics.",
				true,
			],
			["Set priority", "Set operational urgency for the conversation.", true],
			[
				"Categorize conversation",
				"Add the conversation to a matching saved view.",
				false,
			],
		],
	},
	{
		title: "Action tools",
		description: "Finish actions available after Otto has handled the request.",
		tools: [
			[
				"Finish: Escalate",
				"Hand the conversation to a person with a concise summary.",
				true,
			],
			["Finish: Resolve", "Mark a fully handled conversation resolved.", true],
			["Finish: Mark spam", "Close obvious abuse and spam quickly.", true],
		],
	},
] as const;

export function AgentToolsPage() {
	const [customOpen, setCustomOpen] = useState(false);
	const [toolStates, setToolStates] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(
			toolGroups.flatMap((group) =>
				group.tools.map((tool) => [tool[0], tool[2]]),
			),
		),
	);
	return (
		<AgentPageFrame
			action={
				<Button onClick={() => setCustomOpen(true)}>
					<Plus size={15} /> Create custom tool
				</Button>
			}
			title="Tools & Skills"
		>
			<section className="od-tool-section">
				<div className="od-section-copy">
					<h2>Custom tools</h2>
					<p>
						Add reusable instructions for workflows outside Otto's default
						tools.
					</p>
				</div>
				<div className="od-tool-empty">
					<Sparkles size={19} />
					<p>No custom tools yet.</p>
					<Button onClick={() => setCustomOpen(true)} variant="primary">
						Create
					</Button>
				</div>
			</section>
			{toolGroups.map((group) => (
				<section className="od-tool-section" key={group.title}>
					<div className="od-section-copy">
						<h2>{group.title}</h2>
						<p>{group.description}</p>
					</div>
					<div className="od-tool-grid">
						{group.tools.map(([name, description]) => (
							<article className="od-tool-card" key={name}>
								<div className="od-tool-card__head">
									<strong>{name}</strong>
									<Toggle
										checked={toolStates[name] ?? false}
										label={`Toggle ${name}`}
										onChange={(checked) =>
											setToolStates((current) => ({
												...current,
												[name]: checked,
											}))
										}
									/>
								</div>
								<p>{description}</p>
								<Button size="sm">Edit skill</Button>
							</article>
						))}
					</div>
				</section>
			))}
			<Modal
				description="Define a focused capability the agent can call during a conversation."
				onClose={() => setCustomOpen(false)}
				open={customOpen}
				title="Create custom tool"
			>
				<div className="od-modal__body">
					<Field label="Tool name" placeholder="Check order status" />
					<Field
						label="Description"
						placeholder="Use when a visitor asks where their order is."
					/>
					<TextAreaField
						defaultValue="## Instructions\n\nDescribe when and how Otto should use this tool."
						label="Skill instructions"
						rows={8}
					/>
				</div>
				<div className="od-modal__footer">
					<Button onClick={() => setCustomOpen(false)}>Cancel</Button>
					<Button onClick={() => setCustomOpen(false)} variant="primary">
						Create tool
					</Button>
				</div>
			</Modal>
		</AgentPageFrame>
	);
}

export function WebSourcesPage() {
	const [addOpen, setAddOpen] = useState(false);
	const [sources, setSources] = useState(["otto.so"]);
	const [newUrl, setNewUrl] = useState("");
	const [crawling, setCrawling] = useState(false);
	return (
		<WorkspaceShell
			mode="agent"
			rightRail={
				<TrainingSummary
					pages={sources.length * 3}
					trained={sources.length > 1}
				/>
			}
		>
			<div className="od-training-page">
				<PageTitle
					action={
						<Button onClick={() => setAddOpen(true)}>
							<Plus size={15} /> Add website
						</Button>
					}
				>
					Web Sources
				</PageTitle>
				<div className="od-source-limits">
					<div>
						<span>Link Sources</span>
						<strong>{sources.length} / 5</strong>
					</div>
					<SegmentedMeter filled={sources.length * 8} segments={40} />
					<div>
						<span>Total Pages</span>
						<strong>{sources.length * 3} / 25</strong>
					</div>
					<SegmentedMeter filled={sources.length * 5} segments={40} />
					<div>
						<span>Knowledge Base Size</span>
						<strong>{sources.length} KB / 1 MB</strong>
					</div>
					<SegmentedMeter filled={Math.max(1, sources.length)} segments={40} />
					<a href="/settings/plan">Upgrade for 1,000+ pages</a>
				</div>
				<div className="od-source-list">
					{sources.map((source) => (
						<div className="od-source-domain" key={source}>
							<div className="od-source-domain__head">
								<Globe2 size={15} />
								<strong>{source}</strong>
								<span>1 source · 3 pages · 1 KB</span>
								<Button
									aria-label={`Refresh ${source}`}
									size="icon"
									variant="ghost"
								>
									<RefreshCw size={14} />
								</Button>
								<ChevronDown size={14} />
							</div>
							<div className="od-source-tree">
								<div>
									/ <small>1 KB</small>
								</div>
								<div>
									/docs <small>0.4 KB</small>
								</div>
								<div>
									/pricing <small>0.2 KB</small>
								</div>
							</div>
						</div>
					))}
				</div>
				{sources.length === 0 ? (
					<EmptyState
						action={
							<Button onClick={() => setAddOpen(true)} variant="primary">
								Add website
							</Button>
						}
						description="Crawl your docs, marketing site, or help center."
						icon={<Globe2 size={22} />}
						title="No web sources yet"
					/>
				) : null}
			</div>
			<Modal
				description="Otto discovers linked pages and adds them to the agent's knowledge base."
				onClose={() => setAddOpen(false)}
				open={addOpen}
				title="Add a website"
			>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						if (!newUrl) return;
						setCrawling(true);
						window.setTimeout(() => {
							try {
								setSources((current) => [
									...current,
									new URL(newUrl).hostname.replace("www.", ""),
								]);
							} catch {
								setSources((current) => [...current, newUrl]);
							}
							setCrawling(false);
							setAddOpen(false);
							setNewUrl("");
						}, 1300);
					}}
				>
					<div className="od-modal__body">
						<Field
							autoFocus
							hint="Start with your homepage or documentation root."
							label="Website URL"
							onChange={(event) => setNewUrl(event.target.value)}
							placeholder="https://docs.example.com"
							type="url"
							value={newUrl}
						/>
						<div className="od-crawl-options">
							<SettingToggle
								checked
								description="Follow links on the same domain."
								onChange={() => {}}
								title="Discover linked pages"
							/>
							<SettingToggle
								checked
								description="Keep this source synchronized every 24 hours."
								onChange={() => {}}
								title="Automatic recrawling"
							/>
						</div>
						{crawling ? (
							<div className="od-crawling">
								<RefreshCw className="od-spin" size={15} /> Discovering pages
								and reading content...
							</div>
						) : null}
					</div>
					<div className="od-modal__footer">
						<Button onClick={() => setAddOpen(false)} type="button">
							Cancel
						</Button>
						<Button
							disabled={!newUrl || crawling}
							type="submit"
							variant="primary"
						>
							{crawling ? "Crawling..." : "Add and crawl"}
						</Button>
					</div>
				</form>
			</Modal>
		</WorkspaceShell>
	);
}

export function FaqPage() {
	const [faqs, setFaqs] = useState([
		{
			question: "Can I install Otto in a Next.js app?",
			answer:
				"Yes. Install @otto/sdk, add OttoProvider, and mount the widget once near your root layout.",
		},
	]);
	const [open, setOpen] = useState(false);
	const [question, setQuestion] = useState("");
	const [answer, setAnswer] = useState("");
	return (
		<WorkspaceShell
			mode="agent"
			rightRail={
				<TrainingSummary faqs={faqs.length} trained={faqs.length > 1} />
			}
		>
			<div className="od-training-page">
				<PageTitle
					action={
						<Button onClick={() => setOpen(true)}>
							<Plus size={15} /> Add FAQ
						</Button>
					}
				>
					FAQ
				</PageTitle>
				<p className="od-page-intro">
					Give the agent exact answers for questions that should never be
					ambiguous.
				</p>
				<div className="od-faq-list">
					{faqs.map((faq, index) => (
						<article key={`${faq.question}-${index}`}>
							<div>
								<CircleHelp size={17} />
								<div>
									<strong>{faq.question}</strong>
									<p>{faq.answer}</p>
								</div>
							</div>
							<Button
								aria-label="Delete FAQ"
								onClick={() =>
									setFaqs((current) =>
										current.filter((_, faqIndex) => faqIndex !== index),
									)
								}
								size="icon"
								variant="ghost"
							>
								<Trash2 size={15} />
							</Button>
						</article>
					))}
				</div>
			</div>
			<Modal
				description="The answer is inserted directly into the agent's searchable knowledge base."
				onClose={() => setOpen(false)}
				open={open}
				title="Add FAQ"
			>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						if (!question || !answer) return;
						setFaqs((current) => [...current, { question, answer }]);
						setQuestion("");
						setAnswer("");
						setOpen(false);
					}}
				>
					<div className="od-modal__body">
						<Field
							label="Question"
							onChange={(event) => setQuestion(event.target.value)}
							placeholder="How does billing work?"
							value={question}
						/>
						<TextAreaField
							label="Answer"
							onChange={(event) => setAnswer(event.target.value)}
							placeholder="Give the canonical answer..."
							rows={6}
							value={answer}
						/>
					</div>
					<div className="od-modal__footer">
						<Button onClick={() => setOpen(false)} type="button">
							Cancel
						</Button>
						<Button type="submit" variant="primary">
							Add FAQ
						</Button>
					</div>
				</form>
			</Modal>
		</WorkspaceShell>
	);
}

export function FilesPage() {
	const inputRef = useRef<HTMLInputElement>(null);
	const [files, setFiles] = useState<Array<{ name: string; size: string }>>([]);
	const addFiles = (event: ChangeEvent<HTMLInputElement>) =>
		setFiles(
			Array.from(event.target.files ?? []).map((file) => ({
				name: file.name,
				size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
			})),
		);
	return (
		<WorkspaceShell
			mode="agent"
			rightRail={
				<TrainingSummary files={files.length} trained={files.length > 0} />
			}
		>
			<div className="od-training-page">
				<PageTitle
					action={
						<Button onClick={() => inputRef.current?.click()}>
							<Plus size={15} /> Add file
						</Button>
					}
				>
					Files
				</PageTitle>
				<div className="od-file-counter">
					<span>{files.length} / 10 Files</span>
					<a href="/settings/plan">Upgrade for unlimited files</a>
				</div>
				<p className="od-page-intro">
					Saved files your agent can search during a conversation.
				</p>
				<input
					accept=".pdf,.md,.txt,.doc,.docx"
					className="od-visually-hidden"
					multiple
					onChange={addFiles}
					ref={inputRef}
					type="file"
				/>
				{files.length === 0 ? (
					<EmptyState
						action={
							<Button
								onClick={() => inputRef.current?.click()}
								variant="primary"
							>
								Add file
							</Button>
						}
						description="Add docs, policies, or release notes to give your agent more context."
						icon={<FilePlus2 size={23} />}
						title="No files yet"
					/>
				) : (
					<div className="od-file-list">
						{files.map((file, index) => (
							<article key={`${file.name}-${index}`}>
								<span>
									<Files size={17} />
								</span>
								<div>
									<strong>{file.name}</strong>
									<small>{file.size} · Ready to train</small>
								</div>
								<Button
									aria-label={`Remove ${file.name}`}
									onClick={() =>
										setFiles((current) =>
											current.filter((_, fileIndex) => fileIndex !== index),
										)
									}
									size="icon"
									variant="ghost"
								>
									<Trash2 size={15} />
								</Button>
							</article>
						))}
					</div>
				)}
			</div>
		</WorkspaceShell>
	);
}
