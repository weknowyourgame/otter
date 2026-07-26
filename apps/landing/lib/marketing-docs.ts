import fs from "node:fs";
import path from "node:path";

export type MarketingDoc = {
	title: string;
	description: string;
	body: string;
	slug: string[];
	href: string;
	section: string;
};

const DOCS_ROOT = path.join(process.cwd(), "content", "docs");

function humanize(value: string) {
	return value
		.replace(/\.md$/, "")
		.split("-")
		.map((part) => {
			const normalized = part.toLowerCase();
			if (normalized === "api") return "API";
			if (normalized === "ai") return "AI";
			if (normalized === "mcp") return "MCP";
			return part.charAt(0).toUpperCase() + part.slice(1);
		})
		.join(" ");
}

function parseFrontmatter(raw: string) {
	const data: Record<string, string> = {};
	if (!raw.startsWith("---")) return { data, body: raw };
	const end = raw.indexOf("\n---", 3);
	if (end === -1) return { data, body: raw };
	const header = raw.slice(4, end);
	for (const line of header.split("\n")) {
		const separator = line.indexOf(":");
		if (separator === -1) continue;
		const key = line.slice(0, separator).trim();
		const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
		if (key && value && value !== ">-") data[key] = value;
	}
	return { data, body: raw.slice(end + 4).trim() };
}

function walk(directory: string): string[] {
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const target = path.join(directory, entry.name);
		if (entry.isDirectory()) return walk(target);
		return entry.name.endsWith(".md") ? [target] : [];
	});
}

function brandCopy(value: string) {
	return value
		.replaceAll("cossistantcom/cossistant", "otter-ai/otter")
		.replaceAll("@cossistant", "@otter")
		.replaceAll("Cossistant", "Otter")
		.replaceAll("cossistant", "otter");
}

function toDoc(filePath: string): MarketingDoc {
	const relative = path.relative(DOCS_ROOT, filePath);
	const segments = relative.replace(/\.md$/, "").split(path.sep);
	if (segments[0] === "(root)") segments.shift();
	if (segments.at(-1) === "index") segments.pop();
	const raw = fs.readFileSync(filePath, "utf8");
	const { data, body } = parseFrontmatter(raw);
	const fallbackTitle = segments.length ? humanize(segments.at(-1) ?? "Documentation") : "Documentation";
	const title = brandCopy(data.title ?? fallbackTitle);
	const description = brandCopy(data.description ?? `Learn how to use ${title.toLowerCase()} with Otter.`);
	return {
		title,
		description,
		body: brandCopy(body),
		slug: segments,
		href: `/docs${segments.length ? `/${segments.join("/")}` : ""}`,
		section: segments.length > 1 ? humanize(segments[0]) : segments.length === 1 ? "Overview" : "Start here",
	};
}

const sectionOrder = ["Start here", "Overview", "Quickstart", "Support Component", "Concepts", "Advanced", "User Feedback", "Self Host", "Others"];

export function getAllMarketingDocs() {
	if (!fs.existsSync(DOCS_ROOT)) return [];
	return walk(DOCS_ROOT)
		.map(toDoc)
		.sort((a, b) => {
			const sectionDifference = sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);
			if (sectionDifference !== 0) return sectionDifference;
			if (a.slug.length !== b.slug.length) return a.slug.length - b.slug.length;
			return a.title.localeCompare(b.title);
		});
}

export function getMarketingDoc(slug: string[] = []) {
	const target = slug.join("/");
	return getAllMarketingDocs().find((doc) => doc.slug.join("/") === target);
}

export function stripMdx(source: string) {
	return source
		.split(/(```[\s\S]*?```)/g)
		.map((chunk) => {
			if (chunk.startsWith("```")) return chunk;

			const inlineCode: string[] = [];
			let value = chunk.replace(/`([^`\n]+)`/g, (code) => {
				const token = `@@OTTER_INLINE_${inlineCode.length}@@`;
				inlineCode.push(code);
				return token;
			});

			value = value.replace(
				/<LinkedCard\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/LinkedCard>/g,
				(_match, href: string, content: string) => {
					const label = content
						.replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
						.replace(/<[^>]+>/g, " ")
						.replace(/[{}]/g, "")
						.replace(/\s+/g, " ")
						.trim();
					return `\n[${label}](${href})\n`;
				},
			);
			value = value
				.replace(/^\s*(?:import|export)\s.+$/gm, "")
				.replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
				.replace(/<>|<\/>/g, "")
				.replace(/<\/?[A-Za-z][^>]*>/g, "")
				.replace(/\{["']\s*["']\}/g, " ")
				.replace(/\{(@@OTTER_INLINE_\d+@@)\}/g, "$1")
				.replace(/^\s*[;{}]+\s*$/gm, "");

			inlineCode.forEach((code, index) => {
				value = value.replaceAll(`@@OTTER_INLINE_${index}@@`, code);
			});
			return value;
		})
		.join("")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function slugifyHeading(value: string) {
	return value
		.toLowerCase()
		.replace(/[`*_]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export function getDocToc(source: string) {
	return stripMdx(source)
		.split("\n")
		.filter((line) => /^#{2,3}\s/.test(line))
		.map((line) => {
			const match = line.match(/^(#{2,3})\s+(.+)$/);
			const title = match?.[2] ?? "";
			return { title, id: slugifyHeading(title), level: match?.[1].length ?? 2 };
		});
}
