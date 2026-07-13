// The entire widget design system. Everything lives in one shadow root —
// zero CSS in, zero CSS out. Tokens are CSS custom properties switched by
// [data-theme] so light/dark are first-class, not an afterthought.

export function buildStyles(accent: string, zIndex: number, side: "left" | "right"): string {
	return `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
button { font: inherit; background: none; border: none; cursor: pointer; color: inherit; }
textarea { font: inherit; }

.otto-root {
	--otto-accent: ${accent};
	--otto-accent-ink: #ffffff;
	--otto-danger: #f26d6a;
	--otto-ok: #3fcf8e;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, "Helvetica Neue", Arial, sans-serif;
	font-size: 13.5px;
	line-height: 1.45;
	-webkit-font-smoothing: antialiased;
	text-rendering: optimizeLegibility;
}
.otto-root[data-theme="dark"] {
	--otto-bg: rgba(17, 18, 22, 0.88);
	--otto-solid: #101114;
	--otto-surface: rgba(255, 255, 255, 0.055);
	--otto-surface-2: rgba(255, 255, 255, 0.1);
	--otto-border: rgba(255, 255, 255, 0.09);
	--otto-border-strong: rgba(255, 255, 255, 0.16);
	--otto-text: #f2f3f5;
	--otto-text-2: rgba(242, 243, 245, 0.62);
	--otto-text-3: rgba(242, 243, 245, 0.4);
	--otto-shadow: 0 24px 80px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.35);
	color-scheme: dark;
}
.otto-root[data-theme="light"] {
	--otto-bg: rgba(255, 255, 255, 0.92);
	--otto-solid: #ffffff;
	--otto-surface: rgba(22, 24, 29, 0.045);
	--otto-surface-2: rgba(22, 24, 29, 0.08);
	--otto-border: rgba(22, 24, 29, 0.1);
	--otto-border-strong: rgba(22, 24, 29, 0.18);
	--otto-text: #16181d;
	--otto-text-2: rgba(22, 24, 29, 0.64);
	--otto-text-3: rgba(22, 24, 29, 0.42);
	--otto-shadow: 0 24px 80px rgba(22, 24, 29, 0.18), 0 4px 16px rgba(22, 24, 29, 0.1);
	color-scheme: light;
}

/* ---------- launcher ---------- */
.otto-launcher {
	position: fixed;
	bottom: 24px;
	${side}: 24px;
	width: 54px;
	height: 54px;
	border-radius: 50%;
	background:
		radial-gradient(120% 120% at 30% 20%, color-mix(in srgb, var(--otto-accent) 42%, transparent), transparent 60%),
		#101114;
	border: 1px solid rgba(255, 255, 255, 0.14);
	box-shadow: 0 12px 32px rgba(0, 0, 0, 0.38), 0 2px 6px rgba(0, 0, 0, 0.25);
	display: grid;
	place-items: center;
	z-index: ${zIndex};
	transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease;
}
.otto-launcher:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 18px 42px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.25); }
.otto-launcher:active { transform: scale(0.94); }
.otto-launcher svg { width: 22px; height: 22px; fill: #fff; }

/* ---------- panel ---------- */
.otto-panel {
	position: fixed;
	bottom: 92px;
	${side}: 24px;
	width: 384px;
	max-width: calc(100vw - 24px);
	height: min(620px, calc(100vh - 130px));
	display: flex;
	flex-direction: column;
	background: var(--otto-bg);
	-webkit-backdrop-filter: blur(24px) saturate(150%);
	backdrop-filter: blur(24px) saturate(150%);
	color: var(--otto-text);
	border: 1px solid var(--otto-border);
	border-radius: 20px;
	box-shadow: var(--otto-shadow);
	overflow: hidden;
	z-index: ${zIndex};
	transform-origin: bottom ${side};
	opacity: 0;
	transform: translateY(14px) scale(0.96);
	pointer-events: none;
	transition: opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
}
.otto-panel[data-open="true"] { opacity: 1; transform: none; pointer-events: auto; }

.otto-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 14px 12px 16px;
	border-bottom: 1px solid var(--otto-border);
	flex: none;
}
.otto-brand { display: flex; align-items: center; gap: 10px; }
.otto-brand-dot {
	width: 30px; height: 30px; border-radius: 9px;
	background: linear-gradient(135deg, var(--otto-accent), color-mix(in srgb, var(--otto-accent) 65%, #000));
	display: grid; place-items: center;
	box-shadow: 0 2px 8px color-mix(in srgb, var(--otto-accent) 45%, transparent);
}
.otto-brand-dot svg { width: 15px; height: 15px; fill: #fff; }
.otto-brand h1 { font-size: 14px; font-weight: 650; letter-spacing: -0.01em; }
.otto-brand p { font-size: 11px; color: var(--otto-text-3); margin-top: 1px; }
.otto-header-actions { display: flex; gap: 2px; }
.otto-icon-btn {
	width: 30px; height: 30px; border-radius: 8px;
	display: grid; place-items: center;
	color: var(--otto-text-3);
	transition: background 140ms ease, color 140ms ease;
}
.otto-icon-btn:hover { background: var(--otto-surface-2); color: var(--otto-text); }
.otto-icon-btn svg { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

/* ---------- messages ---------- */
.otto-messages {
	flex: 1;
	overflow-y: auto;
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 10px;
	overscroll-behavior: contain;
}
/* Children of an overflowing flex column shrink by default — the trail box
   (overflow:hidden, no min-content floor) would collapse to a 2px line. */
.otto-messages > * { flex: none; }
.otto-messages::-webkit-scrollbar { width: 8px; }
.otto-messages::-webkit-scrollbar-thumb { background: var(--otto-surface-2); border-radius: 4px; }
.otto-messages::-webkit-scrollbar-track { background: transparent; }

@keyframes otto-in { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: none; } }
.otto-msg, .otto-trail, .otto-card, .otto-typing { animation: otto-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both; }

.otto-msg { max-width: 86%; padding: 9px 13px; border-radius: 15px; white-space: pre-wrap; word-wrap: break-word; }
.otto-msg-user {
	align-self: flex-end;
	background: linear-gradient(135deg, var(--otto-accent), color-mix(in srgb, var(--otto-accent) 78%, #000));
	color: var(--otto-accent-ink);
	border-bottom-right-radius: 5px;
	box-shadow: 0 2px 10px color-mix(in srgb, var(--otto-accent) 30%, transparent);
}
.otto-msg-agent {
	align-self: flex-start;
	background: var(--otto-surface);
	border: 1px solid var(--otto-border);
	border-bottom-left-radius: 5px;
}
.otto-msg-error { border-color: color-mix(in srgb, var(--otto-danger) 45%, transparent); }

.otto-typing {
	align-self: flex-start; display: flex; gap: 4px;
	padding: 12px 14px; border-radius: 15px; border-bottom-left-radius: 5px;
	background: var(--otto-surface); border: 1px solid var(--otto-border);
}
.otto-typing span { width: 5px; height: 5px; border-radius: 50%; background: var(--otto-text-3); animation: otto-dot 1.2s ease-in-out infinite; }
.otto-typing span:nth-child(2) { animation-delay: 0.15s; }
.otto-typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes otto-dot { 0%, 60%, 100% { opacity: 0.35; transform: none; } 30% { opacity: 1; transform: translateY(-3px); } }

/* ---------- step trail ---------- */
.otto-trail {
	align-self: stretch;
	background: var(--otto-surface);
	border: 1px solid var(--otto-border);
	border-radius: 13px;
	overflow: hidden;
}
.otto-trail-head {
	display: none;
	width: 100%;
	align-items: center;
	gap: 8px;
	padding: 9px 12px;
	font-size: 12.5px;
	font-weight: 550;
	color: var(--otto-text-2);
	text-align: left;
}
.otto-trail[data-finished="true"] .otto-trail-head { display: flex; }
.otto-trail-head .otto-check { color: var(--otto-ok); }
.otto-trail-head[data-kind="fail"] .otto-check, .otto-trail-head[data-kind="stopped"] .otto-check { color: var(--otto-danger); }
.otto-trail-chevron { margin-left: auto; transition: transform 180ms ease; color: var(--otto-text-3); }
.otto-trail[data-open="true"] .otto-trail-chevron { transform: rotate(180deg); }
.otto-trail-steps { display: flex; flex-direction: column; padding: 5px 7px; }
.otto-trail[data-finished="true"] .otto-trail-steps { display: none; border-top: 1px solid var(--otto-border); }
.otto-trail[data-finished="true"][data-open="true"] .otto-trail-steps { display: flex; }

.otto-step { display: flex; align-items: flex-start; gap: 9px; padding: 6px 6px; border-radius: 8px; animation: otto-in 180ms ease both; }
.otto-step-icon { flex: none; width: 16px; height: 16px; margin-top: 1px; display: grid; place-items: center; }
.otto-step-text { font-size: 12.5px; color: var(--otto-text-2); }
.otto-step[data-state="active"] .otto-step-text { color: var(--otto-text); animation: otto-breathe 1.6s ease-in-out infinite; }
@keyframes otto-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

.otto-spinner { width: 13px; height: 13px; }
.otto-spinner circle {
	fill: none; stroke: var(--otto-accent); stroke-width: 2.6; stroke-linecap: round;
	stroke-dasharray: 26 10; transform-origin: center;
	animation: otto-spin 0.9s linear infinite;
}
@keyframes otto-spin { to { transform: rotate(360deg); } }

.otto-check svg, .otto-cross svg { width: 13px; height: 13px; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; fill: none; }
.otto-check svg { stroke: var(--otto-ok); stroke-dasharray: 20; stroke-dashoffset: 20; animation: otto-draw 260ms ease forwards; }
.otto-cross svg { stroke: var(--otto-danger); }
@keyframes otto-draw { to { stroke-dashoffset: 0; } }

/* ---------- consent / confirm cards ---------- */
.otto-card {
	align-self: stretch;
	background: var(--otto-surface);
	border: 1px solid var(--otto-border-strong);
	border-radius: 14px;
	padding: 13px 14px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.otto-card-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 620; }
.otto-card-title svg { width: 15px; height: 15px; flex: none; stroke: var(--otto-accent); fill: none; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.otto-card[data-danger="true"] .otto-card-title svg { stroke: var(--otto-danger); }
.otto-card-body { font-size: 12.5px; color: var(--otto-text-2); }
.otto-card-row { display: flex; gap: 8px; justify-content: flex-end; }
.otto-btn {
	border-radius: 10px; padding: 7px 14px; font-size: 12.5px; font-weight: 600;
	transition: transform 120ms ease, filter 120ms ease, background 120ms ease;
}
.otto-btn:active { transform: scale(0.96); }
.otto-btn-primary { background: var(--otto-accent); color: var(--otto-accent-ink); box-shadow: 0 2px 10px color-mix(in srgb, var(--otto-accent) 35%, transparent); }
.otto-btn-primary:hover { filter: brightness(1.1); }
.otto-btn-danger { background: var(--otto-danger); color: #fff; }
.otto-btn-danger:hover { filter: brightness(1.08); }
.otto-btn-ghost { color: var(--otto-text-2); border: 1px solid var(--otto-border-strong); }
.otto-btn-ghost:hover { background: var(--otto-surface-2); color: var(--otto-text); }
.otto-card-resolved { font-size: 12px; color: var(--otto-text-3); display: flex; align-items: center; gap: 6px; }

/* ---------- composer ---------- */
.otto-composer { padding: 10px 12px 6px; flex: none; }
.otto-composer-box {
	display: flex; align-items: flex-end; gap: 8px;
	background: var(--otto-surface);
	border: 1px solid var(--otto-border);
	border-radius: 14px;
	padding: 8px 8px 8px 13px;
	transition: border-color 140ms ease, box-shadow 140ms ease;
}
.otto-composer-box:focus-within {
	border-color: color-mix(in srgb, var(--otto-accent) 55%, transparent);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--otto-accent) 14%, transparent);
}
.otto-input {
	flex: 1; background: transparent; border: none; outline: none; resize: none;
	color: var(--otto-text); font-size: 13.5px; line-height: 1.45;
	max-height: 92px; min-height: 21px;
}
.otto-input::placeholder { color: var(--otto-text-3); }
.otto-send {
	flex: none; width: 30px; height: 30px; border-radius: 9px;
	background: var(--otto-accent); color: var(--otto-accent-ink);
	display: grid; place-items: center;
	transition: transform 140ms ease, opacity 140ms ease, filter 140ms ease;
}
.otto-send:hover { filter: brightness(1.1); }
.otto-send:active { transform: scale(0.92); }
.otto-send:disabled { opacity: 0.35; cursor: default; filter: none; }
.otto-send svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }

.otto-footer {
	text-align: center; padding: 7px 0 9px; flex: none;
	font-size: 10.5px; color: var(--otto-text-3);
	display: flex; align-items: center; justify-content: center; gap: 4px;
}
.otto-footer svg { width: 9px; height: 9px; fill: var(--otto-text-3); }

/* ---------- working pill ---------- */
.otto-pill {
	position: fixed;
	bottom: 22px;
	left: 50%;
	display: flex;
	align-items: center;
	gap: 11px;
	padding: 9px 9px 9px 16px;
	border-radius: 999px;
	background: rgba(16, 17, 20, 0.92);
	-webkit-backdrop-filter: blur(16px);
	backdrop-filter: blur(16px);
	border: 1px solid rgba(255, 255, 255, 0.12);
	box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
	color: #f2f3f5;
	font-family: inherit;
	font-size: 12.5px;
	font-weight: 550;
	z-index: ${zIndex};
	transform: translate(-50%, 90px);
	opacity: 0;
	pointer-events: none;
	transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease;
}
.otto-pill[data-visible="true"] { transform: translate(-50%, 0); opacity: 1; pointer-events: auto; }
.otto-pill-dot { position: relative; width: 8px; height: 8px; flex: none; }
.otto-pill-dot::before, .otto-pill-dot::after {
	content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--otto-accent);
}
.otto-pill-dot::after { animation: otto-ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite; }
@keyframes otto-ping { 0% { transform: scale(1); opacity: 0.7; } 80%, 100% { transform: scale(2.6); opacity: 0; } }
.otto-pill-status { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.otto-pill-divider { width: 1px; height: 16px; background: rgba(255, 255, 255, 0.16); flex: none; }
.otto-pill-stop {
	color: #ff8480; font-weight: 640; font-size: 12.5px;
	padding: 5px 12px; border-radius: 999px;
	transition: background 140ms ease;
}
.otto-pill-stop:hover { background: rgba(255, 132, 128, 0.14); }

/* ---------- cursor + ring (page overlay) ---------- */
.otto-cursor {
	position: fixed;
	top: 0; left: 0;
	z-index: ${zIndex + 2};
	pointer-events: none;
	display: none;
	filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
	--otto-accent: ${accent};
}
.otto-cursor.otto-cursor-visible { display: block; }
.otto-cursor-tag {
	position: absolute;
	top: 18px; left: 15px;
	background: var(--otto-accent);
	color: #fff;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	font-size: 11px;
	font-weight: 620;
	letter-spacing: 0.01em;
	padding: 3px 8px;
	border-radius: 999px;
	white-space: nowrap;
}
.otto-cursor-ripple {
	position: absolute;
	top: -4px; left: -4px;
	width: 30px; height: 30px;
	border-radius: 50%;
	background: color-mix(in srgb, var(--otto-accent) 55%, transparent);
	opacity: 0;
	pointer-events: none;
}

.otto-ring {
	position: fixed;
	z-index: ${zIndex + 1};
	pointer-events: none;
	border: 2px solid ${accent};
	border-radius: 10px;
	box-shadow: 0 0 0 4px color-mix(in srgb, ${accent} 18%, transparent), 0 0 24px color-mix(in srgb, ${accent} 35%, transparent);
	opacity: 0;
	transform: scale(1.06);
	transition: top 200ms cubic-bezier(0.22, 1, 0.36, 1), left 200ms cubic-bezier(0.22, 1, 0.36, 1),
		width 200ms cubic-bezier(0.22, 1, 0.36, 1), height 200ms cubic-bezier(0.22, 1, 0.36, 1),
		opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.otto-ring-visible { opacity: 1; transform: scale(1); }

@media (max-width: 480px) {
	.otto-panel { ${side}: 12px; bottom: 84px; width: calc(100vw - 24px); height: min(560px, calc(100vh - 110px)); }
	.otto-launcher { bottom: 18px; ${side}: 18px; }
}

@media (prefers-reduced-motion: reduce) {
	*, *::before, *::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
	}
}
`;
}
