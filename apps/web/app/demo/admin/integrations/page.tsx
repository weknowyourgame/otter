"use client";

import { useState } from "react";
import { DEFAULT_WEBHOOKS, type Webhook } from "@/components/cordant/data";
import { useStore } from "@/components/cordant/store";
import {
	Badge,
	Button,
	Input,
	PageHeader,
	Panel,
	Select,
	Toggle,
} from "@/components/cordant/ui";

interface ApiKey {
	name: string;
	key: string;
	created: string;
}

const EVENTS = [
	"ticket.created",
	"ticket.updated",
	"ticket.status_changed",
	"comment.added",
];

export default function Integrations() {
	const [keys, setKeys] = useStore<ApiKey[]>("api-keys", [
		{ name: "Production", key: "cd_live_9f3k…c2d1", created: "Mar 2, 2026" },
	]);
	const [webhooks, setWebhooks] = useStore<Webhook[]>(
		"webhooks",
		DEFAULT_WEBHOOKS,
	);
	const [keyName, setKeyName] = useState("");
	const [keyError, setKeyError] = useState("");
	const [hookUrl, setHookUrl] = useState("");
	const [hookEvent, setHookEvent] = useState(EVENTS[0]);
	const [hookError, setHookError] = useState("");

	const createKey = () => {
		const value = keyName.trim();
		if (!value) {
			setKeyError("Give the key a name first.");
			return;
		}
		setKeyError("");
		const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) =>
			b.toString(16).padStart(2, "0"),
		).join("");
		setKeys([
			...keys,
			{
				name: value,
				key: `cd_live_${rand}…${rand.slice(0, 4)}`,
				created: new Date().toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				}),
			},
		]);
		setKeyName("");
	};

	const addWebhook = () => {
		if (!/^https?:\/\/.+/.test(hookUrl.trim())) {
			setHookError("Enter a valid URL starting with https://");
			return;
		}
		setHookError("");
		setWebhooks([
			...webhooks,
			{
				id: `wh-${Date.now()}`,
				url: hookUrl.trim(),
				event: hookEvent,
				active: true,
			},
		]);
		setHookUrl("");
	};

	return (
		<>
			<PageHeader
				title="Integrations"
				sub="API keys and outgoing webhooks for this workspace."
				crumbs={[{ label: "Admin console" }, { label: "Integrations" }]}
			/>

			<Panel
				title="Create an API key"
				sub="Keys are shown once — store them safely."
			>
				<div className="grid max-w-md gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
					<Input
						placeholder="e.g. Staging server"
						aria-label="Key name"
						value={keyName}
						onChange={(e) => setKeyName(e.target.value)}
					/>
					<Button variant="primary" onClick={createKey}>
						Create key
					</Button>
				</div>
				{keyError && (
					<p className="mt-2 text-[12.5px] font-medium text-red-600">
						{keyError}
					</p>
				)}
			</Panel>

			<Panel title={`Active keys · ${keys.length}`} dense>
				<ul className="px-6 py-2">
					{keys.map((k) => (
						<li
							key={k.key}
							className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-zinc-100"
						>
							<div className="min-w-0 flex-1">
								<p className="text-[13.5px] font-medium text-zinc-800">
									{k.name}
								</p>
								<p className="font-mono text-[12px] text-zinc-500">{k.key}</p>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<span className="text-[12px] text-zinc-400">
									Created {k.created}
								</span>
								<Badge tone="green">Active</Badge>
								<Button
									variant="danger"
									onClick={() => setKeys(keys.filter((x) => x.key !== k.key))}
								>
									Revoke
								</Button>
							</div>
						</li>
					))}
				</ul>
			</Panel>

			<Panel
				title="Add a webhook"
				sub="We'll POST a JSON payload to this URL when the event fires."
			>
				<div className="grid max-w-xl gap-2.5 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
					<Input
						placeholder="https://hooks.example.com/…"
						aria-label="Webhook URL"
						value={hookUrl}
						onChange={(e) => setHookUrl(e.target.value)}
						className="flex-1"
					/>
					<Select
						aria-label="Webhook event"
						value={hookEvent}
						onChange={setHookEvent}
						options={EVENTS}
						className="w-full"
					/>
					<Button variant="primary" onClick={addWebhook}>
						Add
					</Button>
				</div>
				{hookError && (
					<p className="mt-2 text-[12.5px] font-medium text-red-600">
						{hookError}
					</p>
				)}
			</Panel>

			<Panel title={`Webhooks · ${webhooks.length}`} dense>
				<ul className="px-6 py-2">
					{webhooks.map((w) => (
						<li
							key={w.id}
							className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-zinc-100"
						>
							<div className="flex items-center justify-between gap-3 sm:block">
								<Toggle
									checked={w.active}
									onChange={(v) =>
										setWebhooks(
											webhooks.map((x) =>
												x.id === w.id ? { ...x, active: v } : x,
											),
										)
									}
									label={`Enable webhook to ${w.url}`}
								/>
								<Badge tone={w.active ? "green" : "zinc"}>
									{w.active ? "Active" : "Paused"}
								</Badge>
							</div>
							<div className="min-w-0 flex-1">
								<p className="break-all font-mono text-[12.5px] text-zinc-700 sm:truncate">
									{w.url}
								</p>
								<p className="text-[11.5px] text-zinc-500">on {w.event}</p>
							</div>
							<Button
								variant="danger"
								onClick={() =>
									setWebhooks(webhooks.filter((x) => x.id !== w.id))
								}
							>
								Remove
							</Button>
						</li>
					))}
					{webhooks.length === 0 && (
						<p className="py-6 text-center text-[13px] text-zinc-400">
							No webhooks configured.
						</p>
					)}
				</ul>
			</Panel>
		</>
	);
}
