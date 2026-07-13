"use client";

import { useEffect } from "react";

function random(seed: number) {
	const value = Math.sin(seed * 12.9898) * 43758.5453;
	return value - Math.floor(value);
}

/** Draws the exported hero's procedural field without loading Framer at runtime. */
export function OttoRuntime() {
	useEffect(() => {
		const hero = document
			.querySelector("#main h1")
			?.closest<HTMLElement>("[data-framer-name=\"Heading Container\"]");
		if (!hero) return;

		const host = document.createElement("div");
		host.dataset.ottoHeroField = "true";
		Object.assign(host.style, {
			position: "absolute",
			inset: "0",
			overflow: "hidden",
			pointerEvents: "none",
			zIndex: "0",
		});
		const canvas = document.createElement("canvas");
		canvas.setAttribute("aria-hidden", "true");
		canvas.style.display = "block";
		host.append(canvas);
		hero.prepend(host);

		const draw = () => {
			const bounds = host.getBoundingClientRect();
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.round(bounds.width * dpr);
			canvas.height = Math.round(bounds.height * dpr);
			canvas.style.width = `${bounds.width}px`;
			canvas.style.height = `${bounds.height}px`;

			const context = canvas.getContext("2d");
			if (!context) return;
			context.setTransform(dpr, 0, 0, dpr, 0, 0);
			context.clearRect(0, 0, bounds.width, bounds.height);

			const step = 6;
			for (let y = 0; y < bounds.height; y += step) {
				for (let x = 0; x < bounds.width; x += step) {
					const fromCenter = Math.hypot(
						(x / bounds.width - 0.5) / 0.88,
						(y / bounds.height - 0.5) / 0.69,
					);
					const density = Math.min(0.74, 0.07 + fromCenter * 0.7);
					const seed = (x / step + 1) * 193 + (y / step + 1) * 389;
					if (random(seed) > density) continue;
					const hue = random(seed + 7);
					const alpha = 0.18 + random(seed + 13) * 0.58;
					context.fillStyle = hue > 0.84
						? `rgba(99, 148, 255, ${alpha})`
						: hue > 0.68
							? `rgba(181, 126, 255, ${alpha})`
							: `rgba(245, 245, 245, ${alpha})`;
					context.fillRect(x, y, random(seed + 31) > 0.8 ? 3 : 2, 2);
				}
			}
		};

		draw();
		const observer = new ResizeObserver(draw);
		observer.observe(hero);
		return () => {
			observer.disconnect();
			host.remove();
		};
	}, []);

	return null;
}
