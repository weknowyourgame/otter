"use client";

import { useStore } from "@/components/cordant/store";
import { PageHeader, Panel, Row, Toggle } from "@/components/cordant/ui";

export default function Notifications() {
	const [prefs, setPrefs] = useStore("notifications", {
		assignedToMe: true,
		mentions: false,
		slaBreaches: true,
		weeklyDigest: true,
		productUpdates: false,
	});
	const set = (key: keyof typeof prefs) => (v: boolean) => setPrefs({ ...prefs, [key]: v });

	return (
		<>
			<PageHeader title="Notifications" sub="Choose what lands in your inbox." crumbs={[{ label: "My settings" }, { label: "Notifications" }]} />
			<Panel title="Email notifications">
				<Row label="Assigned to me" sub="When a ticket is assigned or reassigned to you.">
					<Toggle checked={prefs.assignedToMe} onChange={set("assignedToMe")} label="Assigned to me" />
				</Row>
				<Row label="Mentions" sub="When a teammate @mentions you in a comment.">
					<Toggle checked={prefs.mentions} onChange={set("mentions")} label="Mentions" />
				</Row>
				<Row label="SLA breaches" sub="Immediately, when a ticket you're watching misses its SLA.">
					<Toggle checked={prefs.slaBreaches} onChange={set("slaBreaches")} label="SLA breaches" />
				</Row>
				<Row label="Weekly digest" sub="A summary of workspace activity, every Monday.">
					<Toggle checked={prefs.weeklyDigest} onChange={set("weeklyDigest")} label="Weekly digest" />
				</Row>
				<Row label="Product updates" sub="New Cordant features and improvements, about once a month.">
					<Toggle checked={prefs.productUpdates} onChange={set("productUpdates")} label="Product updates" />
				</Row>
			</Panel>
		</>
	);
}
