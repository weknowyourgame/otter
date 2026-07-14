import Link from "next/link";
import type { ReactNode } from "react";
import { slugifyHeading, stripMdx } from "@/lib/marketing-docs";

function inline(value: string): ReactNode[] {
	const output: ReactNode[] = [];
	const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
	let cursor = 0;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(value))) {
		if (match.index > cursor) output.push(value.slice(cursor, match.index));
		if (match[2] && match[3]) {
			const external = /^https?:/.test(match[3]);
			output.push(
				<Link href={match[3]} key={`${match.index}-${match[3]}`} rel={external ? "noreferrer" : undefined} target={external ? "_blank" : undefined}>
					{match[2]}
				</Link>,
			);
		} else if (match[4]) {
			output.push(<strong key={`${match.index}-strong`}>{match[4]}</strong>);
		} else if (match[5]) {
			output.push(<code key={`${match.index}-code`}>{match[5]}</code>);
		}
		cursor = pattern.lastIndex;
	}
	if (cursor < value.length) output.push(value.slice(cursor));
	return output;
}

export function Markdown({ source }: { source: string }) {
	const lines = stripMdx(source).split("\n");
	const blocks: ReactNode[] = [];
	let index = 0;
	while (index < lines.length) {
		const line = lines[index];
		const trimmed = line.trim();
		if (!trimmed) {
			index++;
			continue;
		}
		if (trimmed.startsWith("```")) {
			const language = trimmed.slice(3).split(" ")[0];
			const code: string[] = [];
			index++;
			while (index < lines.length && !lines[index].trim().startsWith("```")) code.push(lines[index++]);
			index++;
			blocks.push(<pre data-language={language || "text"} key={`code-${index}`}><code>{code.join("\n")}</code></pre>);
			continue;
		}
		const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
		if (heading) {
			const level = heading[1].length;
			const title = heading[2];
			const id = slugifyHeading(title);
			if (level === 1) blocks.push(<h1 id={id} key={`h-${index}`}>{inline(title)}</h1>);
			else if (level === 2) blocks.push(<h2 id={id} key={`h-${index}`}>{inline(title)}</h2>);
			else blocks.push(<h3 id={id} key={`h-${index}`}>{inline(title)}</h3>);
			index++;
			continue;
		}
		if (/^[-*]\s+/.test(trimmed)) {
			const items: string[] = [];
			while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) items.push(lines[index++].replace(/^\s*[-*]\s+/, ""));
			blocks.push(<ul key={`ul-${index}`}>{items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{inline(item)}</li>)}</ul>);
			continue;
		}
		if (/^\d+\.\s+/.test(trimmed)) {
			const items: string[] = [];
			while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) items.push(lines[index++].replace(/^\s*\d+\.\s+/, ""));
			blocks.push(<ol key={`ol-${index}`}>{items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{inline(item)}</li>)}</ol>);
			continue;
		}
		if (trimmed.startsWith(">")) {
			blocks.push(<blockquote key={`quote-${index}`}>{inline(trimmed.replace(/^>\s?/, ""))}</blockquote>);
			index++;
			continue;
		}
		if (/^\|.*\|$/.test(trimmed) || /^[-:| ]+$/.test(trimmed)) {
			index++;
			continue;
		}
		const paragraph = [trimmed];
		index++;
		while (
			index < lines.length &&
			lines[index].trim() &&
			!/^#{1,4}\s|^```|^[-*]\s+|^\d+\.\s+|^>/.test(lines[index].trim())
		) {
			if (!/^\|.*\|$/.test(lines[index].trim())) paragraph.push(lines[index].trim());
			index++;
		}
		blocks.push(<p key={`p-${index}`}>{inline(paragraph.join(" "))}</p>);
	}
	return <div className="mk-markdown">{blocks}</div>;
}
