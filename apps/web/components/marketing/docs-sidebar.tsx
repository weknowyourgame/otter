"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

type SidebarDoc = { title: string; href: string; section: string };

export function DocsSidebar({ docs }: { docs: SidebarDoc[] }) {
	const [query, setQuery] = useState("");
	const pathname = usePathname();
	const sections = useMemo(() => {
		const filtered = docs.filter((doc) => doc.title.toLowerCase().includes(query.toLowerCase()));
		return filtered.reduce<Record<string, SidebarDoc[]>>((groups, doc) => {
			(groups[doc.section] ??= []).push(doc);
			return groups;
		}, {});
	}, [docs, query]);

	return (
		<aside className="mk-docs-sidebar">
			<label className="mk-docs-search">
				<span aria-hidden="true">⌕</span>
				<input onChange={(event) => setQuery(event.target.value)} placeholder="Search docs" type="search" value={query} />
			</label>
			<nav aria-label="Documentation">
				{Object.entries(sections).map(([section, items]) => (
					<div className="mk-docs-nav-group" key={section}>
						<strong>{section}</strong>
						{items.map((doc) => (
							<Link aria-current={pathname === doc.href ? "page" : undefined} href={doc.href} key={doc.href}>{doc.title}</Link>
						))}
					</div>
				))}
			</nav>
		</aside>
	);
}
