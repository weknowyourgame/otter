"use client";

import { useStore } from "@/components/nimbus/store";
import { PageHeader, Panel, Row, Toggle } from "@/components/nimbus/ui";

export default function Notifications() {
	const [prefs, setPrefs] = useStore("notifications", {
		productUpdates: true,
		weeklyDigest: true,
		pipelineFailures: true,
		mentions: false,
		marketing: false,
	});
	const set = (key: keyof typeof prefs) => (v: boolean) => setPrefs({ ...prefs, [key]: v });

	return (
		<>
			<PageHeader title="Notifications" sub="Choose what lands in your inbox." />
			<Panel title="Email notifications">
				<Row label="Pipeline failures" sub="Immediately, when a document pipeline errors.">
					<Toggle checked={prefs.pipelineFailures} onChange={set("pipelineFailures")} label="Pipeline failures" />
				</Row>
				<Row label="Mentions" sub="When a teammate @mentions you in a comment.">
					<Toggle checked={prefs.mentions} onChange={set("mentions")} label="Mentions" />
				</Row>
				<Row label="Weekly digest" sub="A summary of workspace activity, every Monday.">
					<Toggle checked={prefs.weeklyDigest} onChange={set("weeklyDigest")} label="Weekly digest" />
				</Row>
				<Row label="Product updates" sub="New features and improvements, about once a month.">
					<Toggle checked={prefs.productUpdates} onChange={set("productUpdates")} label="Product updates" />
				</Row>
				<Row label="Tips & marketing" sub="Occasional guides and offers.">
					<Toggle checked={prefs.marketing} onChange={set("marketing")} label="Tips and marketing" />
				</Row>
			</Panel>
		</>
	);
}
