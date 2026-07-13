import { ottoCss, ottoMarkup, ottoSvgTemplates } from "./otto-reference";
import { OttoRuntime } from "./otto-runtime";

/**
 * The landing page is rendered by Next, with the exported responsive DOM and
 * layout rules preserved verbatim. No iframe, redirect, or external page is
 * involved; all visual media is served from this app's public directory.
 */
export default function Home() {
	return (
		<>
			<style data-otto-reference-css dangerouslySetInnerHTML={{ __html: ottoCss }} />
			<div dangerouslySetInnerHTML={{ __html: ottoMarkup }} />
			<div dangerouslySetInnerHTML={{ __html: ottoSvgTemplates }} />
			<OttoRuntime />
		</>
	);
}
