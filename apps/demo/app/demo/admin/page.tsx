"use client";

import { useStore } from "@/components/cordant/store";
import { Input, PageHeader, Panel, Row, Select } from "@/components/cordant/ui";

export default function AdminGeneral() {
	const [name, setName] = useStore("workspace-name", "Acme Support Ops");
	const [slug, setSlug] = useStore("workspace-slug", "acme-support");
	const [timezone, setTimezone] = useStore(
		"workspace-timezone",
		"America/Los_Angeles",
	);
	const [language, setLanguage] = useStore(
		"workspace-language",
		"English (US)",
	);

	return (
		<>
			<PageHeader
				title="General"
				sub="Workspace-wide defaults."
				crumbs={[{ label: "Admin console" }, { label: "General" }]}
			/>

			<Panel title="Workspace">
				<Row
					label="Workspace name"
					sub="Shown in the sidebar and email notifications."
				>
					<Input
						aria-label="Workspace name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="w-full sm:w-56"
					/>
				</Row>
				<Row label="Workspace URL" sub="cordant.app/w/…">
					<Input
						aria-label="Workspace URL slug"
						value={slug}
						onChange={(e) => setSlug(e.target.value)}
						className="w-full sm:w-56"
					/>
				</Row>
			</Panel>

			<Panel title="Localization">
				<Row
					label="Timezone"
					sub="Used for SLA timers and activity timestamps."
				>
					<Select
						aria-label="Timezone"
						value={timezone}
						onChange={setTimezone}
						options={[
							"America/Los_Angeles",
							"America/New_York",
							"Europe/London",
							"Asia/Tokyo",
						]}
						className="w-full sm:w-auto"
					/>
				</Row>
				<Row label="Default language">
					<Select
						aria-label="Default language"
						value={language}
						onChange={setLanguage}
						options={["English (US)", "English (UK)", "Spanish", "Japanese"]}
						className="w-full sm:w-auto"
					/>
				</Row>
			</Panel>
		</>
	);
}
