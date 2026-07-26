import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Markdown } from "@/components/marketing/markdown";
import { getAllMarketingDocs, getDocToc, getMarketingDoc } from "@/lib/marketing-docs";

export const dynamicParams = false;

export function generateStaticParams() {
	return getAllMarketingDocs().map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
	const { slug = [] } = await params;
	const doc = getMarketingDoc(slug);
	return doc ? { title: `${doc.title} - Otter Docs`, description: doc.description } : {};
}

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
	const { slug = [] } = await params;
	const docs = getAllMarketingDocs();
	const doc = getMarketingDoc(slug);
	if (!doc) notFound();
	const currentIndex = docs.findIndex((item) => item.href === doc.href);
	const previous = docs[currentIndex - 1];
	const next = docs[currentIndex + 1];
	const toc = getDocToc(doc.body);

	return (
		<MarketingShell>
			<div className="mk-docs-layout">
				<DocsSidebar docs={docs.map(({ title, href, section }) => ({ title, href, section }))} />
				<article className="mk-docs-article">
					<header>
						<p className="mk-kicker">[Otter documentation]</p>
						<h1>{doc.title}</h1>
						<p>{doc.description}</p>
					</header>
					<Markdown source={doc.body} />
					<nav className="mk-docs-pagination" aria-label="Documentation pagination">
						{previous ? <Link href={previous.href}>← {previous.title}</Link> : <span />}
						{next ? <Link href={next.href}>{next.title} →</Link> : <span />}
					</nav>
				</article>
				<aside className="mk-docs-toc">
					<strong>On this page</strong>
					{toc.map((item) => <a data-level={item.level} href={`#${item.id}`} key={item.id}>{item.title}</a>)}
				</aside>
			</div>
		</MarketingShell>
	);
}
