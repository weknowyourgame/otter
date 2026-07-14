"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BenefitsSection } from "./benefits-section";
import { InstallSection } from "./install-section";
import { SupportWidget } from "./support-widget";

function visible(element: Element) {
	const bounds = element.getBoundingClientRect();
	return bounds.width > 0 && bounds.height > 0;
}

export function LandingSupportSections() {
	const [host, setHost] = useState<HTMLDivElement | null>(null);

	useEffect(() => {
		const navChanges: Array<{ anchor: HTMLAnchorElement; href: string; label: string; text: HTMLElement | null }> = [];
		const destinations: Record<string, { href: string; label: string }> = {
			Dashboard: { href: "/price", label: "Pricing" },
			Trust: { href: "/docs", label: "Docs" },
			Embed: { href: "/changelog", label: "Changelog" },
		};
		document.querySelectorAll<HTMLAnchorElement>("nav a").forEach((anchor) => {
			const label = anchor.textContent?.trim() ?? "";
			const destination = destinations[label];
			if (!destination) return;
			const text = anchor.querySelector<HTMLElement>("p");
			navChanges.push({ anchor, href: anchor.getAttribute("href") ?? "", label, text });
			anchor.setAttribute("href", destination.href);
			if (text) text.textContent = destination.label;
			else anchor.textContent = destination.label;
		});

		const featureGrid = Array.from(
			document.querySelectorAll<HTMLElement>('[data-framer-name="Grid Features"]'),
		).find(visible);
		if (!featureGrid) {
			return () => {
				navChanges.forEach(({ anchor, href, label, text }) => {
					anchor.setAttribute("href", href);
					if (text) text.textContent = label;
				});
			};
		}

		const portalHost = document.createElement("div");
		portalHost.id = "otto-support-sections";
		portalHost.dataset.ottoSupportSections = "true";
		portalHost.style.order = getComputedStyle(featureGrid).order;
		featureGrid.after(portalHost);
		setHost(portalHost);

		return () => {
			portalHost.remove();
			navChanges.forEach(({ anchor, href, label, text }) => {
				anchor.setAttribute("href", href);
				if (text) text.textContent = label;
			});
		};
	}, []);

	if (!host) return null;

	return createPortal(
		<div className="mk-page mk-landing-insert">
			<div className="mk-shell">
				<InstallSection />
				<BenefitsSection />
			</div>
			<SupportWidget />
		</div>,
		host,
	);
}
