import { ottoCss, ottoMarkup, ottoSvgTemplates } from "./otto-reference";
import { OttoRuntime } from "./otto-runtime";

const pageMarkup = ottoMarkup
	.replace(
		/Otto turns customer questions into completed work inside your product[^<]*/,
		"Automate routine support and focus on what matters most. Less friction, more flow.",
	)
	.replace("Help customers finish work in the moment.", "Finish customer work in moments.")
	.replace("Add an action-ready support agent.", "Embed an action-ready agent.")
	.replace("Support that stays inside your product.", "Trusted by product teams.")
	.replace("Support that gets the task done.", "Get agentic AI to work on your workflows");

/**
 * Keep the exported responsive DOM and layout rules intact. The runtime adds
 * the motion and interactions that are normally supplied by Framer.
 */
export default function Home() {
	return (
		<>
			<style data-otto-reference-css dangerouslySetInnerHTML={{ __html: ottoCss }} />
			<div dangerouslySetInnerHTML={{ __html: pageMarkup }} />
			<div dangerouslySetInnerHTML={{ __html: ottoSvgTemplates }} />
			<OttoRuntime />
		</>
	);
}
