"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SupportWidget } from "./support-widget";

const packageManagers = ["pnpm", "npm", "yarn", "bun"] as const;
type PackageManager = (typeof packageManagers)[number];

const commands: Record<PackageManager, string> = {
	pnpm: "pnpm add @otto/next",
	npm: "npm install @otto/next",
	yarn: "yarn add @otto/next",
	bun: "bun add @otto/next",
};

const ascii = `,.:l>><<iI:^  .:l<~}()[]--~<++-]}?.<lI:^\n:l<~}()[]--~<++-]}?.<lI:^  .:l>><<iI:^\n:I<~)(tffffttf      l<~)(tffffttf\n^;i_}|fxnuvcXYCL0q  ^;i_}|fxnuvcXYCL0q\n'I<](fxvzXYJL0q      'I<](fxvzXYJL0q\n.l~[ljnczXUC0ww      .l~[ljnczXUC0ww\n:l~[(fxuvcXJ0q       :l~[(fxuvcXJ0q\n^;i_}/fxnuvcZCmh     ^;i_}/fxnuvcZCmh\n I>~[_]\\/ffjxuU0ok    I>~[_]\\/ffjxuU0ok\n<~[1l]tfffjzuv0k     <~[1l]tfffjzuv0k\n<^]\\frnuuuuucCm     <^]\\frnuuuuucCm`;

export function InstallSection() {
	const [preview, setPreview] = useState(true);
	const [framework, setFramework] = useState<"next" | "react">("next");
	const [manager, setManager] = useState<PackageManager>("npm");
	const [copied, setCopied] = useState(false);
	const command = useMemo(
		() => commands[manager].replace("@otto/next", framework === "next" ? "@otto/next" : "@otto/react"),
		[framework, manager],
	);

	const copyCommand = async () => {
		await navigator.clipboard.writeText(command);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1300);
	};

	return (
		<section className="mk-install" id="install">
			<div className="mk-install-preview">
				<div className="mk-preview-tabs" role="tablist" aria-label="Install preview mode">
					<button aria-selected={preview} onClick={() => setPreview(true)} role="tab" type="button">[ Preview ]</button>
					<button aria-selected={!preview} onClick={() => setPreview(false)} role="tab" type="button">Code</button>
				</div>
				<pre aria-hidden="true" className="mk-ascii-field">{ascii.repeat(4)}</pre>
				{preview ? (
					<SupportWidget defaultOpen embedded />
				) : (
					<pre className="mk-preview-code"><code>{`import { Support } from "@otto/${framework === "next" ? "next" : "react"}";\n\nexport function App() {\n  return <Support publicKey="pk_live_..." />;\n}`}</code></pre>
				)}
			</div>

			<div className="mk-install-copy">
				<p className="mk-kicker">[For React + Next.js]</p>
				<h2>Add a support AI agent to your app in one command.</h2>
				<p className="mk-muted mk-install-description">
					Not a separate tool. Not a generic widget. A support AI agent that lives in your product and learns how your team works.
				</p>
				<div className="mk-framework-tabs" role="tablist" aria-label="Framework">
					<button aria-selected={framework === "next"} onClick={() => setFramework("next")} role="tab" type="button">[ ◐ Next.js ]</button>
					<button aria-selected={framework === "react"} onClick={() => setFramework("react")} role="tab" type="button">⚛ React</button>
				</div>
				<div className="mk-command-box">
					<div className="mk-command-tabs">
						<span aria-hidden="true">›_</span>
						{packageManagers.map((item) => (
							<button aria-selected={manager === item} key={item} onClick={() => setManager(item)} type="button">
								{manager === item ? `[ ${item} ]` : item}
							</button>
						))}
						<button className="mk-copy-command" onClick={copyCommand} title="Copy command" type="button">{copied ? "Copied" : "Copy"}</button>
					</div>
					<code>{command}</code>
				</div>
				<div className="mk-install-actions">
					<Link className="mk-button mk-button-primary" href="/demo">Install Otto</Link>
					<Link className="mk-button mk-button-ghost" href="/docs">Read the docs</Link>
				</div>
			</div>
		</section>
	);
}
