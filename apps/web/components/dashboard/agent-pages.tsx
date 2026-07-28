"use client";

import {
	Bot,
	Check,
	CircleHelp,
	FilePlus2,
	Files,
	Globe2,
	Plus,
	RefreshCw,
	Sparkles,
	Trash2,
} from "lucide-react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
	Button,
	EmptyState,
	Field,
	Modal,
	PageTitle,
	PanelFooter,
	SelectField,
	SettingsSection,
	SettingToggle,
	TextAreaField,
	Toggle,
} from "./ui";
import { TrainingSummary, WorkspaceShell } from "./workspace-shell";

type AgentConfig = {
	name: string;
	model: string;
	systemPrompt: string | null;
	maxToolCalls: number;
	extendedReasoning: boolean;
	enabled: boolean;
	tonePreset: string;
	voiceTone: string | null;
	clarificationPolicy: string | null;
	escalationPolicy: string | null;
	toolSettings: Record<string, boolean>;
};

function useAgentConfig() {
	const [config, setConfig] = useState<AgentConfig | null>(null);

	useEffect(() => {
		let active = true;
		fetch("/api/account/agent")
			.then((response) => (response.ok ? response.json() : null))
			.then((body: { agent?: AgentConfig } | null) => {
				if (active && body?.agent) setConfig(body.agent);
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);

	async function save(patch: Partial<AgentConfig>): Promise<boolean> {
		if (!config) return false;
		const next = { ...config, ...patch };
		const response = await fetch("/api/account/agent", {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(next),
		});
		if (!response.ok) return false;
		const body = (await response.json()) as { agent: AgentConfig };
		setConfig(body.agent);
		return true;
	}

	return { config, save };
}

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

const MODEL_OPTIONS = [
	{ value: "openai/gpt-5.3-codex", label: "GPT-5.3 Codex" },
];

export function AgentGeneralPage() {
	const { config, save } = useAgentConfig();
	const [name, setName] = useState("");
	const [model, setModel] = useState("");
	const [systemPrompt, setSystemPrompt] = useState("");
	const [maxToolCalls, setMaxToolCalls] = useState(6);
	const [extendedReasoning, setExtendedReasoning] = useState(true);
	const [enabled, setEnabled] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		if (!config) return;
		setName(config.name);
		setModel(config.model);
		setSystemPrompt(config.systemPrompt ?? "");
		setMaxToolCalls(config.maxToolCalls);
		setExtendedReasoning(config.extendedReasoning);
		setEnabled(config.enabled);
	}, [config]);

	async function handleSave() {
		setSaving(true);
		const ok = await save({
			name: name.trim() || "Otter Support",
			model,
			systemPrompt: systemPrompt.trim() || null,
			maxToolCalls,
			extendedReasoning,
			enabled,
		});
		setSaving(false);
		if (ok) {
			setSaved(true);
			window.setTimeout(() => setSaved(false), 1400);
		}
	}

	return (
		<AgentPageFrame
			action={
				<span className="od-agent-live">
					<i /> {enabled ? "Agent live" : "Agent off"}
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
							<strong>{name || "Otter Support"}</strong>
							<p>AI teammate</p>
						</div>
						<Toggle
							checked={enabled}
							label="Enable Otter agent"
							onChange={setEnabled}
						/>
					</div>
					<Field
						label="Agent name"
						onChange={(event) => setName(event.target.value)}
						value={name}
					/>
					<SelectField
						hint="Used for primary customer replies."
						label="AI model"
						onChange={(event) => setModel(event.target.value)}
						value={model}
					>
						{MODEL_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</SelectField>
					<TextAreaField
						hint="Appended to Otter's base instructions — describe persona and priorities, not tool syntax."
						label="System prompt"
						onChange={(event) => setSystemPrompt(event.target.value)}
						rows={8}
						value={systemPrompt}
					/>
				</div>
				<PanelFooter>
					<span className="od-save-note">
						{saved ? (
							<>
								<Check size={14} /> Saved
							</>
						) : (
							`${Math.max(0, 8000 - systemPrompt.length)} characters remaining`
						)}
					</span>
					<Button
						disabled={saving || !config}
						onClick={() => void handleSave()}
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
					checked={extendedReasoning}
					description="Recommended for technical support and multi-step troubleshooting."
					onChange={(checked) => {
						setExtendedReasoning(checked);
						void save({ extendedReasoning: checked });
					}}
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
						max="12"
						min="1"
						onChange={(event) => {
							const value = Number(event.target.value);
							setMaxToolCalls(value);
							void save({ maxToolCalls: value });
						}}
						type="number"
						value={maxToolCalls}
					/>
				</div>
			</SettingsSection>
		</AgentPageFrame>
	);
}

const behaviorFields = [
	{
		key: "voiceTone" as const,
		title: "Voice & tone",
		description: "How Otter should sound across every conversation.",
	},
	{
		key: "clarificationPolicy" as const,
		title: "Clarification policy",
		description: "When the agent should ask a question before acting.",
	},
	{
		key: "escalationPolicy" as const,
		title: "Escalation policy",
		description: "How to recognize and handle situations requiring a person.",
	},
];

export function AgentBehaviourPage() {
	const { config, save } = useAgentConfig();
	const [tone, setTone] = useState("Balanced");
	const [values, setValues] = useState({
		voiceTone: "",
		clarificationPolicy: "",
		escalationPolicy: "",
	});
	const [savingKey, setSavingKey] = useState<string | null>(null);
	const [savedKey, setSavedKey] = useState<string | null>(null);

	useEffect(() => {
		if (!config) return;
		setTone(config.tonePreset);
		setValues({
			voiceTone: config.voiceTone ?? "",
			clarificationPolicy: config.clarificationPolicy ?? "",
			escalationPolicy: config.escalationPolicy ?? "",
		});
	}, [config]);

	async function saveField(key: keyof typeof values) {
		setSavingKey(key);
		const ok = await save({ [key]: values[key].trim() || null });
		setSavingKey(null);
		if (ok) {
			setSavedKey(key);
			window.setTimeout(() => setSavedKey(null), 1400);
		}
	}

	return (
		<AgentPageFrame title="Behaviour">
			<div className="od-preset-strip">
				<span>Personality preset</span>
				{["Concise", "Balanced", "Warm", "Technical"].map((item) => (
					<button
						className={tone === item ? "is-active" : ""}
						key={item}
						onClick={() => {
							setTone(item);
							void save({ tonePreset: item });
						}}
						type="button"
					>
						{item}
					</button>
				))}
			</div>
			{behaviorFields.map((field) => (
				<SettingsSection
					description={field.description}
					key={field.key}
					title={field.title}
				>
					<div className="od-form-stack">
						<TextAreaField
							aria-label={field.title}
							label="Instructions"
							onChange={(event) =>
								setValues((current) => ({
									...current,
									[field.key]: event.target.value,
								}))
							}
							rows={7}
							value={values[field.key]}
						/>
					</div>
					<PanelFooter>
						<span className="od-save-note">
							{savedKey === field.key ? (
								<>
									<Check size={14} /> Saved
								</>
							) : null}
						</span>
						<Button
							disabled={savingKey === field.key || !config}
							onClick={() => void saveField(field.key)}
							variant="primary"
						>
							Save behavior
						</Button>
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
		description: "Follow-up actions available after Otter completes a request.",
		tools: [
			[
				"Finish: Escalate",
				"Hand the conversation to a person with a concise summary.",
				true,
			],
		],
	},
] as const;

const DEFAULT_TOOL_STATES: Record<string, boolean> = Object.fromEntries(
	toolGroups.flatMap((group) => group.tools.map((tool) => [tool[0], tool[2]])),
);

export function AgentToolsPage() {
	const { config, save } = useAgentConfig();
	const [customOpen, setCustomOpen] = useState(false);
	const [toolStates, setToolStates] =
		useState<Record<string, boolean>>(DEFAULT_TOOL_STATES);

	useEffect(() => {
		if (!config) return;
		setToolStates(
			Object.keys(config.toolSettings).length > 0
				? { ...DEFAULT_TOOL_STATES, ...config.toolSettings }
				: DEFAULT_TOOL_STATES,
		);
	}, [config]);

	function toggleTool(name: string, checked: boolean) {
		setToolStates((current) => {
			const next = { ...current, [name]: checked };
			void save({ toolSettings: next });
			return next;
		});
	}

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
						Add reusable instructions for workflows outside Otter's default
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
										onChange={(checked) => toggleTool(name, checked)}
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
						defaultValue="## Instructions\n\nDescribe when and how Otter should use this tool."
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

type WebDoc = {
	id: string;
	url: string;
	title: string | null;
	status: "pending" | "crawling" | "ready" | "failed";
	errorMessage: string | null;
	sourceType?: "web" | "faq" | "file";
};

function useWebSources() {
	const [docs, setDocs] = useState<WebDoc[] | null>(null);

	async function refresh() {
		const response = await fetch("/api/docs");
		if (!response.ok) return;
		const body = (await response.json()) as { docs: WebDoc[] };
		setDocs(body.docs.filter((doc) => (doc.sourceType ?? "web") === "web"));
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: refresh is redefined every render but should only run once on mount
	useEffect(() => {
		void refresh();
	}, []);

	return { docs, refresh };
}

function statusLabel(status: WebDoc["status"]): string {
	switch (status) {
		case "pending":
			return "Queued";
		case "crawling":
			return "Crawling…";
		case "ready":
			return "Ready";
		case "failed":
			return "Failed";
	}
}

export function WebSourcesPage() {
	const { docs, refresh } = useWebSources();
	const [addOpen, setAddOpen] = useState(false);
	const [newUrl, setNewUrl] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");

	async function addSource(event: FormEvent) {
		event.preventDefault();
		if (!newUrl) return;
		setSubmitting(true);
		setError("");
		const response = await fetch("/api/docs", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ url: newUrl }),
		});
		setSubmitting(false);
		if (!response.ok) {
			setError("Could not add that URL. Check it's a valid, complete address.");
			return;
		}
		await refresh();
		setAddOpen(false);
		setNewUrl("");
	}

	async function removeSource(id: string) {
		await fetch(`/api/docs/${id}`, { method: "DELETE" });
		await refresh();
	}

	return (
		<WorkspaceShell
			mode="agent"
			rightRail={
				<TrainingSummary
					pages={docs?.length ?? 0}
					trained={(docs?.length ?? 0) > 0}
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
				<p className="od-page-intro">
					Otter crawls each website from the URL you submit and adds the
					discovered pages to the agent's knowledge base.
				</p>
				<div className="od-source-list">
					{(docs ?? []).map((doc) => (
						<div className="od-source-domain" key={doc.id}>
							<div className="od-source-domain__head">
								<Globe2 size={15} />
								<strong>{doc.title || doc.url}</strong>
								<span>{statusLabel(doc.status)}</span>
								<Button
									aria-label={`Remove ${doc.url}`}
									onClick={() => void removeSource(doc.id)}
									size="icon"
									variant="ghost"
								>
									<Trash2 size={14} />
								</Button>
							</div>
							{doc.status === "failed" && doc.errorMessage ? (
								<div className="od-source-tree">
									<div>{doc.errorMessage}</div>
								</div>
							) : null}
						</div>
					))}
				</div>
				{docs !== null && docs.length === 0 ? (
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
				description="Otter crawls this website and adds the discovered pages to the agent's knowledge base."
				onClose={() => setAddOpen(false)}
				open={addOpen}
				title="Add a website"
			>
				<form onSubmit={(event) => void addSource(event)}>
					<div className="od-modal__body">
						<Field
							autoFocus
							hint="Start URL; Otter crawls internal pages up to the configured page cap."
							label="Website URL"
							onChange={(event) => setNewUrl(event.target.value)}
							placeholder="https://docs.example.com"
							type="url"
							value={newUrl}
						/>
						{error ? <p className="od-auth-error">{error}</p> : null}
						{submitting ? (
							<div className="od-crawling">
								<RefreshCw className="od-spin" size={15} /> Submitting…
							</div>
						) : null}
					</div>
					<div className="od-modal__footer">
						<Button onClick={() => setAddOpen(false)} type="button">
							Cancel
						</Button>
						<Button
							disabled={!newUrl || submitting}
							type="submit"
							variant="primary"
						>
							{submitting ? "Adding…" : "Add source"}
						</Button>
					</div>
				</form>
			</Modal>
		</WorkspaceShell>
	);
}

type Faq = { id: string; question: string; answer: string };

function useFaqs() {
	const [faqs, setFaqs] = useState<Faq[] | null>(null);

	async function refresh() {
		const response = await fetch("/api/faqs");
		if (!response.ok) return;
		const body = (await response.json()) as { faqs: Faq[] };
		setFaqs(body.faqs);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: refresh is redefined every render but should only run once on mount
	useEffect(() => {
		void refresh();
	}, []);

	return { faqs, refresh };
}

export function FaqPage() {
	const { faqs, refresh } = useFaqs();
	const [open, setOpen] = useState(false);
	const [question, setQuestion] = useState("");
	const [answer, setAnswer] = useState("");
	const [submitting, setSubmitting] = useState(false);
	return (
		<WorkspaceShell
			mode="agent"
			rightRail={
				<TrainingSummary
					faqs={faqs?.length ?? 0}
					trained={(faqs?.length ?? 0) > 0}
				/>
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
					{(faqs ?? []).map((faq) => (
						<article key={faq.id}>
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
									void fetch(`/api/faqs/${faq.id}`, { method: "DELETE" }).then(
										refresh,
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
						setSubmitting(true);
						void fetch("/api/faqs", {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ question, answer }),
						})
							.then(refresh)
							.finally(() => {
								setSubmitting(false);
								setQuestion("");
								setAnswer("");
								setOpen(false);
							});
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
						<Button disabled={submitting} type="submit" variant="primary">
							{submitting ? "Adding…" : "Add FAQ"}
						</Button>
					</div>
				</form>
			</Modal>
		</WorkspaceShell>
	);
}

type FileDoc = {
	id: string;
	title: string | null;
	status: "pending" | "crawling" | "ready" | "failed";
};

const TEXT_EXTENSIONS = [".txt", ".md"];

function readAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}

export function FilesPage() {
	const inputRef = useRef<HTMLInputElement>(null);
	const [files, setFiles] = useState<FileDoc[] | null>(null);
	const [uploading, setUploading] = useState(false);

	async function refresh() {
		const response = await fetch("/api/files");
		if (!response.ok) return;
		const body = (await response.json()) as { files: FileDoc[] };
		setFiles(body.files);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: refresh is redefined every render but should only run once on mount
	useEffect(() => {
		void refresh();
	}, []);

	async function addFiles(event: ChangeEvent<HTMLInputElement>) {
		const selected = Array.from(event.target.files ?? []);
		event.target.value = "";
		if (selected.length === 0) return;
		setUploading(true);
		for (const file of selected) {
			const isText = TEXT_EXTENSIONS.some((ext) =>
				file.name.toLowerCase().endsWith(ext),
			);
			const content = isText ? await readAsText(file).catch(() => null) : null;
			await fetch("/api/files", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name: file.name, content, size: file.size }),
			});
		}
		setUploading(false);
		await refresh();
	}

	async function removeFile(id: string) {
		await fetch(`/api/files/${id}`, { method: "DELETE" });
		await refresh();
	}

	return (
		<WorkspaceShell
			mode="agent"
			rightRail={
				<TrainingSummary
					files={files?.length ?? 0}
					trained={(files?.length ?? 0) > 0}
				/>
			}
		>
			<div className="od-training-page">
				<PageTitle
					action={
						<Button
							disabled={uploading}
							onClick={() => inputRef.current?.click()}
						>
							<Plus size={15} /> {uploading ? "Uploading…" : "Add file"}
						</Button>
					}
				>
					Files
				</PageTitle>
				<p className="od-page-intro">
					Saved files your agent can search during a conversation. Only .txt/.md
					content is indexed today — other formats are stored but not yet
					searchable.
				</p>
				<input
					accept=".pdf,.md,.txt,.doc,.docx"
					className="od-visually-hidden"
					multiple
					onChange={(event) => void addFiles(event)}
					ref={inputRef}
					type="file"
				/>
				{files !== null && files.length === 0 ? (
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
						{(files ?? []).map((file) => (
							<article key={file.id}>
								<span>
									<Files size={17} />
								</span>
								<div>
									<strong>{file.title}</strong>
									<small>
										{file.status === "ready" ? "Ready" : file.status}
									</small>
								</div>
								<Button
									aria-label={`Remove ${file.title}`}
									onClick={() => void removeFile(file.id)}
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
