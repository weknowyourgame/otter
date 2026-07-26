// The visible hand: an animated cursor with a name tag (Figma-multiplayer
// style) plus a target ring that lands on the element about to be touched,
// so the user's eye always arrives before the action does.

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export class Cursor {
	private el: HTMLDivElement;
	private x = 0;
	private y = 0;
	private visible = false;

	constructor(
		root: ShadowRoot,
		private reducedMotion: boolean,
		name: string,
	) {
		this.el = document.createElement("div");
		this.el.className = "otter-cursor";
		this.el.innerHTML = `
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
				<path d="M4.5 2.5L19.5 11.2L12.6 13.1L9.4 19.6L4.5 2.5Z"
					fill="var(--otter-accent)" stroke="rgba(255,255,255,0.9)" stroke-width="1.6"
					stroke-linejoin="round"/>
			</svg>
			<span class="otter-cursor-tag">${escapeHtml(name)}</span>
			<span class="otter-cursor-ripple"></span>`;
		root.appendChild(this.el);
	}

	async show(x: number, y: number): Promise<void> {
		this.x = x;
		this.y = y;
		this.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
		if (this.visible) return;
		this.visible = true;
		this.el.classList.add("otter-cursor-visible");
		if (!this.reducedMotion) {
			await this.el.animate(
				[
					{ opacity: 0, transform: `translate3d(${x}px, ${y + 14}px, 0) scale(0.6)` },
					{ opacity: 1, transform: `translate3d(${x}px, ${y}px, 0) scale(1)` },
				],
				{ duration: 260, easing: EASE },
			).finished.catch(() => {});
		}
	}

	async moveTo(x: number, y: number): Promise<void> {
		if (!this.visible) {
			await this.show(x, y);
			return;
		}
		const dist = Math.hypot(x - this.x, y - this.y);
		const from = `translate3d(${this.x}px, ${this.y}px, 0)`;
		const to = `translate3d(${x}px, ${y}px, 0)`;
		this.x = x;
		this.y = y;
		this.el.style.transform = to;
		if (this.reducedMotion || dist < 2) return;
		const duration = Math.min(820, Math.max(320, dist * 0.85));
		await this.el.animate([{ transform: from }, { transform: to }], {
			duration,
			easing: EASE,
		}).finished.catch(() => {});
	}

	async press(): Promise<void> {
		const ripple = this.el.querySelector<HTMLElement>(".otter-cursor-ripple");
		if (!ripple) return;
		if (this.reducedMotion) return;
		const squeeze = this.el.animate(
			[
				{ transform: `translate3d(${this.x}px, ${this.y}px, 0) scale(1)` },
				{ transform: `translate3d(${this.x}px, ${this.y}px, 0) scale(0.86)`, offset: 0.4 },
				{ transform: `translate3d(${this.x}px, ${this.y}px, 0) scale(1)` },
			],
			{ duration: 240, easing: "ease-out" },
		);
		ripple.animate(
			[
				{ opacity: 0.55, transform: "scale(0.3)" },
				{ opacity: 0, transform: "scale(2.4)" },
			],
			{ duration: 420, easing: "ease-out" },
		);
		await squeeze.finished.catch(() => {});
	}

	hide(): void {
		if (!this.visible) return;
		this.visible = false;
		const finish = () => this.el.classList.remove("otter-cursor-visible");
		if (this.reducedMotion) {
			finish();
			return;
		}
		this.el
			.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-out" })
			.finished.then(finish)
			.catch(finish);
	}

	destroy(): void {
		this.el.remove();
	}
}

export class TargetRing {
	private el: HTMLDivElement;

	constructor(root: ShadowRoot) {
		this.el = document.createElement("div");
		this.el.className = "otter-ring";
		root.appendChild(this.el);
	}

	showOver(rect: DOMRect): void {
		const pad = 5;
		this.el.style.top = `${rect.top - pad}px`;
		this.el.style.left = `${rect.left - pad}px`;
		this.el.style.width = `${rect.width + pad * 2}px`;
		this.el.style.height = `${rect.height + pad * 2}px`;
		this.el.classList.add("otter-ring-visible");
	}

	hide(): void {
		this.el.classList.remove("otter-ring-visible");
	}

	destroy(): void {
		this.el.remove();
	}
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
