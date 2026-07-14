"use client";

import { useEffect } from "react";

const MOTION_RUNTIME_VERSION = "mirage-motion-v2";

function random(seed: number) {
	const value = Math.sin(seed * 12.9898) * 43758.5453;
	return value - Math.floor(value);
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function isVisible(element: Element) {
	const bounds = element.getBoundingClientRect();
	return bounds.width > 0 && bounds.height > 0;
}

function makeClone(element: Element) {
	const clone = element.cloneNode(true) as HTMLElement;
	clone.setAttribute("aria-hidden", "true");
	clone.querySelectorAll<HTMLElement>("a, button, input, textarea, select, [tabindex]").forEach((item) => {
		item.tabIndex = -1;
	});
	return clone;
}

/** Restores the motion and interaction layer omitted by the static Framer export. */
export function OttoRuntime() {
	useEffect(() => {
		const main = document.querySelector<HTMLElement>("#main");
		if (!main) return;

		const cleanups: Array<() => void> = [];
		const videos = Array.from(main.querySelectorAll<HTMLVideoElement>("video"));
		videos.forEach((video, index) => {
			video.autoplay = true;
			video.loop = true;
			video.muted = true;
			video.defaultMuted = true;
			video.playsInline = true;
			video.preload = "auto";
			video.classList.add("otto-motion-video");
			video.style.setProperty("--otto-video-index", String(index));
			video.parentElement?.classList.add("otto-media-shell");
			video.load();
		});
		cleanups.push(() => {
			videos.forEach((video) => {
				video.pause();
				video.classList.remove("otto-motion-video");
				video.style.removeProperty("--otto-video-index");
				video.parentElement?.classList.remove("otto-media-shell", "otto-media-live");
			});
		});

		const playVideo = (video: HTMLVideoElement) => {
			void video.play().catch(() => undefined);
		};

		if ("IntersectionObserver" in window) {
			const videoObserver = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						const video = entry.target as HTMLVideoElement;
						if (entry.isIntersecting) {
							video.parentElement?.classList.add("otto-media-live");
							playVideo(video);
						} else {
							video.pause();
						}
					});
				},
				{ rootMargin: "180px 0px", threshold: 0.02 },
			);
			videos.forEach((video) => videoObserver.observe(video));
			cleanups.push(() => videoObserver.disconnect());
		} else {
			videos.forEach(playVideo);
		}

		const headings = Array.from(main.querySelectorAll<HTMLElement>("h1"));
		const heading = headings.find(isVisible) ?? headings[0];
		if (heading) {
			heading.classList.add("otto-hero-heading");
			const letters = Array.from(heading.querySelectorAll<HTMLElement>("span span")).filter(
				(span) => span.children.length === 0 && Boolean(span.textContent?.trim()),
			);
			letters.forEach((letter, index) => {
				letter.classList.add("otto-letter");
				letter.style.setProperty("--otto-letter-index", String(index));
			});
			cleanups.push(() => {
				heading.classList.remove("otto-hero-heading");
				letters.forEach((letter) => {
					letter.classList.remove("otto-letter");
					letter.style.removeProperty("--otto-letter-index");
				});
			});
		}

		const heroSection = heading?.closest<HTMLElement>("[data-framer-name=\"Hero\"]");
		const hero = heading?.closest<HTMLElement>("[data-framer-name=\"Heading Container\"]");
		if (heroSection) {
			const heroCopy = Array.from(
				heroSection.querySelectorAll<HTMLElement>(
					"p, [data-framer-name=\"Hero CTA\"], [data-framer-name=\"Customers Container\"]",
				),
			).filter(
				(element) =>
					isVisible(element) &&
					!element.closest("h1") &&
					!(element.tagName === "P" && Boolean(element.closest("a"))),
			);
			heroCopy.forEach((element, index) => {
				element.classList.add("otto-hero-copy");
				element.style.setProperty("--otto-hero-copy-index", String(index));
			});
			cleanups.push(() => {
				heroCopy.forEach((element) => {
					element.classList.remove("otto-hero-copy");
					element.style.removeProperty("--otto-hero-copy-index");
				});
			});
		}

		if (hero) {
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

			let width = 0;
			let height = 0;
			let frame = 0;
			let lastFrame = 0;
			let heroIsVisible = true;
			let pointerX = 0;
			let pointerY = 0;
			let targetPointerX = 0;
			let targetPointerY = 0;

			const resize = () => {
				const bounds = host.getBoundingClientRect();
				const dpr = Math.min(window.devicePixelRatio || 1, 2);
				width = bounds.width;
				height = bounds.height;
				canvas.width = Math.round(width * dpr);
				canvas.height = Math.round(height * dpr);
				canvas.style.width = `${width}px`;
				canvas.style.height = `${height}px`;
				canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
			};

			const draw = (time: number) => {
				const context = canvas.getContext("2d");
				if (!context || !width || !height) return;
				context.clearRect(0, 0, width, height);
				pointerX += (targetPointerX - pointerX) * 0.08;
				pointerY += (targetPointerY - pointerY) * 0.08;
				const step = width < 700 ? 7 : 6;
				for (let y = 0; y < height; y += step) {
					for (let x = 0; x < width; x += step) {
						const nx = x / width - 0.5;
						const ny = y / height - 0.5;
						const fromCenter = Math.hypot(nx / 0.88, ny / 0.69);
						const pointerDistance = Math.hypot(nx - pointerX * 0.42, ny - pointerY * 0.42);
						const pointerGlow = Math.max(0, 1 - pointerDistance * 2.7);
						const seed = (x / step + 1) * 193 + (y / step + 1) * 389;
						const wave = Math.sin(
							time / 900 + nx * 8 - ny * 5 + pointerGlow * 2.2 + random(seed) * 2.4,
						);
						const density = Math.min(0.78, 0.055 + fromCenter * 0.68 + wave * 0.025 - pointerGlow * 0.07);
						if (random(seed) > density) continue;
						const hue = random(seed + 7) + pointerGlow * 0.08;
						const alpha =
							(0.2 + random(seed + 13) * 0.54 + pointerGlow * 0.2) * (0.84 + wave * 0.16);
						context.fillStyle =
							hue > 0.84
								? `rgba(99, 148, 255, ${alpha})`
								: hue > 0.68
									? `rgba(181, 126, 255, ${alpha})`
									: `rgba(245, 245, 245, ${alpha})`;
						const size = random(seed + 31) > 0.8 - pointerGlow * 0.12 ? 3 : 2;
						context.fillRect(x + wave * (0.6 + pointerGlow), y - wave * pointerGlow, size, 2);
					}
				}
			};

			const tick = (time: number) => {
				if (heroIsVisible && time - lastFrame > 42) {
					draw(time);
					lastFrame = time;
				}
				frame = window.requestAnimationFrame(tick);
			};

			const onPointerMove = (event: PointerEvent) => {
				if (!heroSection) return;
				const bounds = heroSection.getBoundingClientRect();
				targetPointerX = clamp((event.clientX - bounds.left) / bounds.width - 0.5, -0.5, 0.5);
				targetPointerY = clamp((event.clientY - bounds.top) / bounds.height - 0.5, -0.5, 0.5);
				heroSection.style.setProperty("--otto-pointer-x", `${targetPointerX * 5}px`);
				heroSection.style.setProperty("--otto-pointer-y", `${targetPointerY * 4}px`);
			};
			const onPointerLeave = () => {
				targetPointerX = 0;
				targetPointerY = 0;
				heroSection?.style.setProperty("--otto-pointer-x", "0px");
				heroSection?.style.setProperty("--otto-pointer-y", "0px");
			};

			resize();
			draw(0);
			const resizeObserver = new ResizeObserver(() => {
				resize();
				draw(lastFrame);
			});
			resizeObserver.observe(hero);
			let heroObserver: IntersectionObserver | undefined;
			heroObserver = new IntersectionObserver(([entry]) => {
				heroIsVisible = entry.isIntersecting;
			});
			heroObserver.observe(hero);
			frame = window.requestAnimationFrame(tick);
			heroSection?.addEventListener("pointermove", onPointerMove);
			heroSection?.addEventListener("pointerleave", onPointerLeave);

			cleanups.push(() => {
				window.cancelAnimationFrame(frame);
				resizeObserver.disconnect();
				heroObserver?.disconnect();
				heroSection?.removeEventListener("pointermove", onPointerMove);
				heroSection?.removeEventListener("pointerleave", onPointerLeave);
				heroSection?.style.removeProperty("--otto-pointer-x");
				heroSection?.style.removeProperty("--otto-pointer-y");
				host.remove();
			});
		}

		const logoTickers = Array.from(
			main.querySelectorAll<HTMLElement>("[data-framer-name=\"Logos Ticker Container\"]"),
		);
		logoTickers.forEach((ticker) => {
			const surface = ticker.querySelector<HTMLElement>("section");
			if (surface) surface.style.opacity = "1";
		});
		cleanups.push(() => {
			logoTickers.forEach((ticker) => ticker.querySelector<HTMLElement>("section")?.style.removeProperty("opacity"));
		});

		const enhanceHorizontalTrack = (track: HTMLElement, speed: number, minimumDuration: number) => {
			if (track.dataset.ottoEnhanced === "true") return;
			const originals = Array.from(track.children);
			if (originals.length < 2) return;
			track.dataset.ottoEnhanced = "true";
			const clones = originals.map(makeClone);
			clones.forEach((clone) => track.append(clone));
			const distance = clones[0].offsetLeft - (originals[0] as HTMLElement).offsetLeft;
			if (distance <= 0) {
				clones.forEach((clone) => clone.remove());
				delete track.dataset.ottoEnhanced;
				return;
			}
			track.style.setProperty("--otto-marquee-distance", `${distance}px`);
			track.style.setProperty("--otto-marquee-duration", `${Math.max(minimumDuration, distance / speed)}s`);
			track.classList.add("otto-marquee-track");
			cleanups.push(() => {
				clones.forEach((clone) => clone.remove());
				track.classList.remove("otto-marquee-track");
				track.style.removeProperty("--otto-marquee-distance");
				track.style.removeProperty("--otto-marquee-duration");
				delete track.dataset.ottoEnhanced;
			});
		};

		logoTickers.forEach((ticker) => {
			const track = ticker.querySelector<HTMLElement>("ul");
			if (track) enhanceHorizontalTrack(track, 46, 26);
		});

		const scrollers = Array.from(
			main.querySelectorAll<HTMLElement>("[data-framer-name=\"Scroller Customers\"]"),
		);
		scrollers.forEach((scroller) => {
			const track = scroller.querySelector<HTMLElement>("ul");
			if (!track) return;
			enhanceHorizontalTrack(track, 64, 34);
			Array.from(track.children).forEach((item) => item.classList.add("otto-rail-card"));
			cleanups.push(() => {
				Array.from(track.children).forEach((item) => item.classList.remove("otto-rail-card"));
			});
		});

		const reviewWalls = Array.from(
			main.querySelectorAll<HTMLElement>("[data-framer-name=\"Reviews Container\"]"),
		);
		reviewWalls.forEach((wall) => {
			const tracks = Array.from(wall.querySelectorAll<HTMLElement>("ul")).filter(isVisible);
			tracks.forEach((track, index) => {
				if (track.dataset.ottoEnhanced === "true") return;
				const originals = Array.from(track.children);
				if (!originals.length) return;
				track.dataset.ottoEnhanced = "true";
				const clones = originals.map(makeClone);
				clones.forEach((clone) => track.append(clone));
				const distance = clones[0].offsetTop - (originals[0] as HTMLElement).offsetTop;
				if (distance <= 0) {
					clones.forEach((clone) => clone.remove());
					delete track.dataset.ottoEnhanced;
					return;
				}
				track.style.setProperty("--otto-review-distance", `${distance}px`);
				track.style.setProperty("--otto-review-duration", `${index % 2 === 0 ? 38 : 44}s`);
				track.classList.add("otto-review-track");
				if (index % 2 === 1) track.classList.add("otto-review-reverse");
				cleanups.push(() => {
					clones.forEach((clone) => clone.remove());
					track.classList.remove("otto-review-track", "otto-review-reverse");
					track.style.removeProperty("--otto-review-distance");
					track.style.removeProperty("--otto-review-duration");
					delete track.dataset.ottoEnhanced;
				});
			});
		});

		const revealSelector = [
			"[data-framer-name=\"Title Container\"]",
			"[data-framer-name=\"Content Container\"]",
			"[data-framer-name=\"Image Container\"]",
			"[data-framer-name=\"Cards Container\"]",
			"[data-framer-name=\"Logo Grid\"]",
			"[data-framer-name=\"Reviews Container\"]",
			"[data-framer-name=\"Changelog\"] [data-framer-name=\"Card\"]",
		].join(",");
		const revealTargets: HTMLElement[] = [];
		const sections = Array.from(main.querySelectorAll<HTMLElement>("section")).filter(isVisible);
		sections.forEach((section) => {
			const candidates = Array.from(section.querySelectorAll<HTMLElement>(revealSelector)).filter(
				(element) =>
					isVisible(element) &&
					!element.closest("[data-framer-name=\"Meteor - Frame\"]") &&
					!element.closest("[data-framer-name=\"Logos Ticker Container\"]"),
			);
			const outermost = candidates.filter(
				(element) => !candidates.some((candidate) => candidate !== element && candidate.contains(element)),
			);
			outermost.forEach((element, index) => {
				element.classList.add("otto-reveal-item");
				element.style.setProperty("--otto-reveal-index", String(index));
				revealTargets.push(element);
			});
		});

		const revealObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					entry.target.classList.add("otto-reveal-in");
					revealObserver.unobserve(entry.target);
				});
			},
			{ rootMargin: "0px 0px -7%", threshold: 0.04 },
		);
		revealTargets.forEach((target) => revealObserver.observe(target));
		cleanups.push(() => {
			revealObserver.disconnect();
			revealTargets.forEach((target) => {
				target.classList.remove("otto-reveal-item", "otto-reveal-in");
				target.style.removeProperty("--otto-reveal-index");
			});
		});

		const metrics = Array.from(main.querySelectorAll<HTMLElement>("p")).filter((element) => {
			const value = element.textContent?.trim();
			return isVisible(element) && (value === "1 click" || value === "Always");
		});
		metrics.forEach((metric, index) => {
			metric.classList.add("otto-metric-value");
			metric.style.setProperty("--otto-metric-index", String(index));
		});
		const metricObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					entry.target.classList.add("otto-metric-live");
					metricObserver.unobserve(entry.target);
				});
			},
			{ threshold: 0.45 },
		);
		metrics.forEach((metric) => metricObserver.observe(metric));
		cleanups.push(() => {
			metricObserver.disconnect();
			metrics.forEach((metric) => {
				metric.classList.remove("otto-metric-value", "otto-metric-live");
				metric.style.removeProperty("--otto-metric-index");
			});
		});

		const cards = Array.from(
			main.querySelectorAll<HTMLElement>("[data-framer-name=\"Changelog\"] [data-framer-name=\"Card\"]"),
		).filter(isVisible);
		cards.forEach((card) => {
			card.classList.add("otto-changelog-card");
			const onPointerMove = (event: PointerEvent) => {
				const bounds = card.getBoundingClientRect();
				const x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
				const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
				card.style.setProperty("--otto-card-rx", `${(0.5 - y) * 5}deg`);
				card.style.setProperty("--otto-card-ry", `${(x - 0.5) * 6}deg`);
				card.style.setProperty("--otto-card-x", `${x * 100}%`);
				card.style.setProperty("--otto-card-y", `${y * 100}%`);
			};
			const onPointerLeave = () => {
				card.style.setProperty("--otto-card-rx", "0deg");
				card.style.setProperty("--otto-card-ry", "0deg");
			};
			card.addEventListener("pointermove", onPointerMove);
			card.addEventListener("pointerleave", onPointerLeave);
			cleanups.push(() => {
				card.removeEventListener("pointermove", onPointerMove);
				card.removeEventListener("pointerleave", onPointerLeave);
				card.classList.remove("otto-changelog-card");
				["--otto-card-rx", "--otto-card-ry", "--otto-card-x", "--otto-card-y"].forEach((property) =>
					card.style.removeProperty(property),
				);
			});
		});

		const buttons = Array.from(
			main.querySelectorAll<HTMLElement>(
				"a[data-framer-name=\"Hero CTA\"], a[data-framer-name=\"Variant 1\"], a[data-framer-name=\"Desktop\"]",
			),
		).filter(isVisible);
		buttons.forEach((button) => button.classList.add("otto-button-motion"));
		cleanups.push(() => buttons.forEach((button) => button.classList.remove("otto-button-motion")));

		const cta = main.querySelector<HTMLElement>("[data-framer-name=\"CTA\"]");
		const meteors = cta
			? Array.from(
					cta.querySelectorAll<HTMLElement>(
						"[data-framer-name=\"Meteor - Frame\"] [data-framer-name=\"Variant 1\"]",
					),
				)
			: [];
		meteors.forEach((meteor, index) => {
			meteor.classList.add("otto-meteor");
			meteor.style.setProperty("--otto-streak-index", String(index));
			meteor.style.setProperty("--otto-streak-duration", `${3.4 + (index % 5) * 0.48}s`);
		});
		const ctaObserver = cta
			? new IntersectionObserver(
					([entry]) => cta.classList.toggle("otto-cta-live", entry.isIntersecting),
					{ rootMargin: "40% 0px", threshold: 0.01 },
				)
			: undefined;
		if (cta && ctaObserver) {
			cta.classList.add("otto-cta-motion");
			ctaObserver.observe(cta);
		}
		cleanups.push(() => {
			ctaObserver?.disconnect();
			cta?.classList.remove("otto-cta-motion", "otto-cta-live");
			meteors.forEach((meteor) => {
				meteor.classList.remove("otto-meteor");
				meteor.style.removeProperty("--otto-streak-index");
				meteor.style.removeProperty("--otto-streak-duration");
			});
		});

		const nav = Array.from(main.querySelectorAll<HTMLElement>("nav[data-framer-name=\"Desktop\"]")).find(isVisible);
		nav?.classList.add("otto-nav-shell");
		const parallaxTargets = [
			...videos.map((video) => video.parentElement).filter((element): element is HTMLElement => Boolean(element)),
			...Array.from(
				main.querySelectorAll<HTMLElement>(
					"[data-framer-name=\"Main Features\"] [data-framer-name=\"Image Container\"]",
				),
			).filter(isVisible),
		];
		parallaxTargets.forEach((target) => target.classList.add("otto-parallax-target"));
		let motionFrame = 0;
		const updateScrollMotion = () => {
			motionFrame = 0;
			nav?.classList.toggle("otto-nav-scrolled", window.scrollY > 24);
			const viewportHeight = window.innerHeight;
			parallaxTargets.forEach((target, index) => {
				const bounds = target.getBoundingClientRect();
				if (bounds.bottom < -120 || bounds.top > viewportHeight + 120) return;
				const progress = clamp((bounds.top + bounds.height / 2 - viewportHeight / 2) / viewportHeight, -1, 1);
				const amplitude = index === 0 ? 7 : 12;
				target.style.setProperty("--otto-parallax-y", `${progress * -amplitude}px`);
			});
		};
		const requestScrollMotion = () => {
			if (!motionFrame) motionFrame = window.requestAnimationFrame(updateScrollMotion);
		};
		updateScrollMotion();
		window.addEventListener("scroll", requestScrollMotion, { passive: true });
		window.addEventListener("resize", requestScrollMotion);
		cleanups.push(() => {
			window.cancelAnimationFrame(motionFrame);
			window.removeEventListener("scroll", requestScrollMotion);
			window.removeEventListener("resize", requestScrollMotion);
			nav?.classList.remove("otto-nav-shell", "otto-nav-scrolled");
			parallaxTargets.forEach((target) => {
				target.classList.remove("otto-parallax-target");
				target.style.removeProperty("--otto-parallax-y");
			});
		});

		const phones = Array.from(main.querySelectorAll<HTMLElement>("[data-framer-name=\"Phone\"]"));
		phones.forEach((phone) => {
			const toggle = phone.querySelector<HTMLElement>("[data-framer-name=\"Icon\"]");
			const menu = phone.querySelector<HTMLElement>("[data-framer-name=\"Navbar\"]");
			if (!toggle || !menu) return;
			toggle.setAttribute("role", "button");
			toggle.setAttribute("aria-label", "Toggle navigation");
			toggle.setAttribute("aria-expanded", "false");
			const updateMenu = () => {
				const open = !menu.classList.contains("otto-mobile-nav-open");
				menu.classList.toggle("otto-mobile-nav-open", open);
				phone.classList.toggle("otto-mobile-menu-shell", open);
				phone.parentElement?.classList.toggle("otto-mobile-menu-host", open);
				toggle.setAttribute("aria-expanded", String(open));
			};
			const onKeyDown = (event: KeyboardEvent) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				updateMenu();
			};
			toggle.addEventListener("click", updateMenu);
			toggle.addEventListener("keydown", onKeyDown);
			cleanups.push(() => {
				toggle.removeEventListener("click", updateMenu);
				toggle.removeEventListener("keydown", onKeyDown);
				phone.classList.remove("otto-mobile-menu-shell");
				phone.parentElement?.classList.remove("otto-mobile-menu-host");
			});
		});

		return () => cleanups.reverse().forEach((cleanup) => cleanup());
	}, [MOTION_RUNTIME_VERSION]);

	return null;
}
