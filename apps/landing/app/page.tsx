import { ottoCss, ottoMarkup, ottoSvgTemplates } from "./otto-reference";
import { OttoRuntime } from "./otto-runtime";
import { LandingSupportSections } from "@/components/marketing/landing-support-sections";

const CUSTOMER_SHOWCASE_BLOCKS = [
	{
		tag: "div",
		name: "Customers Link",
		comment: "Customer trust nav link commented out for now.",
	},
	{
		tag: "div",
		name: "Customers Container",
		comment: "Customer logo strip commented out for now.",
	},
	{
		tag: "section",
		name: "Customers Slider",
		comment: "Customer quote slider commented out for now.",
	},
	{
		tag: "div",
		name: "Reviews Container",
		comment: "Customer review wall commented out for now.",
	},
] as const;

function findMatchingTagEnd(markup: string, start: number, tag: string): number {
	const matcher = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, "g");
	matcher.lastIndex = start;
	let depth = 0;
	let match: RegExpExecArray | null;

	while ((match = matcher.exec(markup))) {
		depth += match[0].startsWith("</") ? -1 : 1;
		if (depth === 0) return matcher.lastIndex;
	}

	return -1;
}

function commentOutFramerBlock(
	markup: string,
	block: (typeof CUSTOMER_SHOWCASE_BLOCKS)[number],
): string {
	const marker = `data-framer-name="${block.name}"`;
	let output = "";
	let cursor = 0;

	while (true) {
		const markerIndex = markup.indexOf(marker, cursor);
		if (markerIndex === -1) break;

		const start = markup.lastIndexOf(`<${block.tag}`, markerIndex);
		if (start < cursor) {
			cursor = markerIndex + marker.length;
			continue;
		}

		const end = findMatchingTagEnd(markup, start, block.tag);
		if (end === -1) {
			cursor = markerIndex + marker.length;
			continue;
		}

		output += markup.slice(cursor, start);
		output += `<!-- ${block.comment} -->`;
		cursor = end;
	}

	return output + markup.slice(cursor);
}

function commentOutCustomerShowcase(markup: string): string {
	return CUSTOMER_SHOWCASE_BLOCKS.reduce(
		(current, block) => commentOutFramerBlock(current, block),
		markup,
	);
}

const pageMarkup = commentOutCustomerShowcase(
	ottoMarkup
	.replace(
		/Otto turns customer questions into completed work inside your product[^<]*/,
		"Automate routine support and focus on what matters most. Less friction, more flow.",
	)
	.replace("Help customers finish work in the moment.", "Finish customer work in moments.")
	.replace("Add an action-ready support agent.", "Embed an action-ready agent.")
	.replace("Support that gets the task done.", "Get agentic AI to work on your workflows"),
);

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
			<LandingSupportSections />
		</>
	);
}
