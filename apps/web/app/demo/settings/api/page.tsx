"use client";

import { useState } from "react";
import { useStore } from "@/components/nimbus/store";
import { Badge, Button, Input, PageHeader, Panel } from "@/components/nimbus/ui";

interface ApiKey {
	name: string;
	key: string;
	created: string;
}

export default function ApiKeys() {
	const [keys, setKeys] = useStore<ApiKey[]>("api-keys", [
		{ name: "Production", key: "nb_live_9f3k…c2d1", created: "Mar 2, 2026" },
	]);
	const [name, setName] = useState("");
	const [error, setError] = useState("");

	const createKey = () => {
		const value = name.trim();
		if (!value) {
			setError("Give the key a name first.");
			return;
		}
		setError("");
		const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) =>
			b.toString(16).padStart(2, "0"),
		).join("");
		setKeys([
			...keys,
			{
				name: value,
				key: `nb_live_${rand}…${rand.slice(0, 4)}`,
				created: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
			},
		]);
		setName("");
	};

	return (
		<>
			<PageHeader title="API keys" sub="Authenticate requests to the Nimbus API." />

			<Panel title="Create a key" sub="Keys are shown once — store them safely.">
				<div className="flex max-w-md gap-2.5">
					<Input
						placeholder="e.g. Staging server"
						aria-label="Key name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<Button variant="primary" onClick={createKey} className="flex-none">
						Create key
					</Button>
				</div>
				{error && <p className="mt-2 text-[12.5px] font-medium text-red-600">{error}</p>}
			</Panel>

			<Panel title={`Active keys · ${keys.length}`}>
				<ul>
					{keys.map((k) => (
						<li
							key={k.key}
							className="flex items-center gap-4 py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-zinc-100"
						>
							<div className="min-w-0 flex-1">
								<p className="text-[13.5px] font-medium text-zinc-800">{k.name}</p>
								<p className="font-mono text-[12px] text-zinc-500">{k.key}</p>
							</div>
							<span className="text-[12px] text-zinc-400">Created {k.created}</span>
							<Badge tone="green">Active</Badge>
							<Button variant="danger" onClick={() => setKeys(keys.filter((x) => x.key !== k.key))}>
								Revoke
							</Button>
						</li>
					))}
				</ul>
			</Panel>
		</>
	);
}
