"use client";

import { useState } from "react";
import { useStore } from "@/components/nimbus/store";
import { Button, Input, PageHeader, Panel } from "@/components/nimbus/ui";

export default function Profile() {
	const [profile, setProfile] = useStore("profile", {
		name: "Demo User",
		email: "demo@nimbus.io",
		title: "Operations",
	});
	const [draft, setDraft] = useState(profile);
	const [saved, setSaved] = useState(false);

	return (
		<>
			<PageHeader title="Profile" sub="How you appear across the workspace." />
			<Panel
				title="Your details"
				footer={
					<div className="flex items-center gap-3">
						<Button
							variant="primary"
							onClick={() => {
								setProfile(draft);
								setSaved(true);
								setTimeout(() => setSaved(false), 2000);
							}}
						>
							Save changes
						</Button>
						{saved && <span className="text-[12.5px] font-medium text-emerald-600">Saved ✓</span>}
					</div>
				}
			>
				<div className="grid max-w-md gap-4">
					<label className="block">
						<span className="mb-1.5 block text-[12.5px] font-medium text-zinc-600">Full name</span>
						<Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
					</label>
					<label className="block">
						<span className="mb-1.5 block text-[12.5px] font-medium text-zinc-600">Email</span>
						<Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
					</label>
					<label className="block">
						<span className="mb-1.5 block text-[12.5px] font-medium text-zinc-600">Job title</span>
						<Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
					</label>
				</div>
			</Panel>
		</>
	);
}
