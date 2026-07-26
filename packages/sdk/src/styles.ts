// The entire widget design system. Everything lives in one shadow root —
// zero CSS in, zero CSS out. Tokens are CSS custom properties switched by
// [data-theme] so light/dark are first-class, not an afterthought.

export function buildStyles(
	accent: string,
	zIndex: number,
	side: "left" | "right",
): string {
	return `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
button { font: inherit; background: none; border: none; cursor: pointer; color: inherit; }
textarea { font: inherit; }

.otter-root {
	--otter-accent: ${accent};
	--otter-accent-ink: #05201c;
	--otter-danger: #f26d6a;
	--otter-ok: #18bc84;
	font-family: var(--font-dashboard-face, "IBM Plex Sans"), "IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	font-size: 14px;
	line-height: 1.45;
	letter-spacing: 0;
	-webkit-font-smoothing: antialiased;
	text-rendering: optimizeLegibility;
}
.otter-root[data-theme="dark"] {
	--otter-bg: #080808;
	--otter-solid: #0d0d0d;
	--otter-surface: #121212;
	--otter-surface-2: #171717;
	--otter-border: #242424;
	--otter-border-soft: #191919;
	--otter-border-strong: #343434;
	--otter-text: #f2f2f2;
	--otter-text-2: #b7b7b7;
	--otter-text-3: #8d8d8d;
	--otter-shadow: 0 22px 72px rgba(0, 0, 0, 0.72);
	color-scheme: dark;
}
.otter-root[data-theme="light"] {
	--otter-bg: #ffffff;
	--otter-solid: #ffffff;
	--otter-surface: #f4f5f4;
	--otter-surface-2: #eceeed;
	--otter-border: #dcdfdd;
	--otter-border-soft: #eceeed;
	--otter-border-strong: #c7ccca;
	--otter-text: #080808;
	--otter-text-2: #4b504e;
	--otter-text-3: #707775;
	--otter-shadow: 0 24px 80px rgba(22, 24, 29, 0.18), 0 4px 16px rgba(22, 24, 29, 0.1);
	color-scheme: light;
}

/* ---------- launcher ---------- */
.otter-launcher {
	position: fixed;
	bottom: 24px;
	${side}: 24px;
	width: 54px;
	height: 54px;
	border-radius: 50%;
	background: var(--otter-text);
	color: var(--otter-bg);
	border: 1px solid rgba(255, 255, 255, 0.14);
	box-shadow: 0 12px 32px rgba(0, 0, 0, 0.38), 0 2px 6px rgba(0, 0, 0, 0.25);
	display: grid;
	place-items: center;
	z-index: ${zIndex};
	transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease;
}
.otter-launcher:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 18px 42px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.25); }
.otter-launcher:active { transform: scale(0.94); }
.otter-launcher svg { width: 22px; height: 22px; fill: currentColor; }

/* ---------- panel ---------- */
.otter-panel {
	position: fixed;
	bottom: 92px;
	${side}: 24px;
	width: 420px;
	max-width: calc(100vw - 24px);
	height: min(620px, calc(100vh - 130px));
	display: flex;
	flex-direction: column;
	background: var(--otter-bg);
	color: var(--otter-text);
	border: 1px solid var(--otter-border);
	border-radius: 6px;
	box-shadow: var(--otter-shadow);
	overflow: hidden;
	z-index: ${zIndex};
	transform-origin: bottom ${side};
	opacity: 0;
	transform: translateY(14px) scale(0.96);
	pointer-events: none;
	transition: opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
}
.otter-panel[data-open="true"] { opacity: 1; transform: none; pointer-events: auto; }

.otter-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 14px 12px 16px;
	border-bottom: 1px solid var(--otter-border);
	flex: none;
}
.otter-brand { display: flex; align-items: center; gap: 10px; }
.otter-avatars { display: flex; align-items: center; flex: none; }
.otter-brand-dot {
	width: 34px; height: 34px; border-radius: 3px;
	background: var(--otter-text);
	color: var(--otter-bg);
	display: grid; place-items: center;
	border: 1px solid var(--otter-border);
}
.otter-brand-dot svg { width: 16px; height: 16px; fill: currentColor; }
.otter-avatar-simple {
	display: grid;
	width: 34px;
	height: 34px;
	margin-left: -1px;
	place-items: center;
	border: 1px solid var(--otter-border);
	border-radius: 3px;
	background: color-mix(in srgb, var(--otter-accent) 14%, var(--otter-bg));
	color: var(--otter-accent);
	font-size: 11px;
	font-weight: 650;
}
.otter-brand h1 { font-size: 14px; font-weight: 600; letter-spacing: 0; }
.otter-brand p { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--otter-text-3); margin-top: 1px; }
.otter-brand p i { width: 6px; height: 6px; border-radius: 50%; background: var(--otter-ok); }
.otter-header-actions { display: flex; gap: 2px; }
.otter-icon-btn {
	width: 32px; height: 32px; border-radius: 4px;
	display: grid; place-items: center;
	color: var(--otter-text-3);
	transition: background 140ms ease, color 140ms ease;
}
.otter-icon-btn:hover { background: var(--otter-surface-2); color: var(--otter-text); }
.otter-icon-btn svg { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

/* ---------- messages ---------- */
.otter-messages {
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
.otter-messages > * { flex: none; }
.otter-messages::-webkit-scrollbar { width: 8px; }
.otter-messages::-webkit-scrollbar-thumb { background: var(--otter-surface-2); border-radius: 4px; }
.otter-messages::-webkit-scrollbar-track { background: transparent; }

@keyframes otter-in { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: none; } }
.otter-msg, .otter-trail, .otter-card, .otter-typing { animation: otter-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both; }

.otter-msg { max-width: 86%; padding: 10px 13px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
.otter-msg-user {
	align-self: flex-end;
	background: var(--otter-accent);
	color: var(--otter-accent-ink);
	border: 1px solid var(--otter-accent);
}
.otter-msg-agent {
	align-self: flex-start;
	background: var(--otter-surface);
	border: 1px solid var(--otter-border);
}
.otter-msg-error { border-color: color-mix(in srgb, var(--otter-danger) 45%, transparent); }

.otter-typing {
	align-self: flex-start; display: flex; gap: 4px;
	padding: 12px 14px; border-radius: 5px;
	background: var(--otter-surface); border: 1px solid var(--otter-border);
}
.otter-typing span { width: 5px; height: 5px; border-radius: 50%; background: var(--otter-text-3); animation: otter-dot 1.2s ease-in-out infinite; }
.otter-typing span:nth-child(2) { animation-delay: 0.15s; }
.otter-typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes otter-dot { 0%, 60%, 100% { opacity: 0.35; transform: none; } 30% { opacity: 1; transform: translateY(-3px); } }

/* ---------- step trail ---------- */
.otter-trail {
	align-self: stretch;
	background: var(--otter-surface);
	border: 1px solid var(--otter-border);
	border-radius: 5px;
	overflow: hidden;
}
.otter-trail-head {
	display: none;
	width: 100%;
	align-items: center;
	gap: 8px;
	padding: 9px 12px;
	font-size: 12.5px;
	font-weight: 550;
	color: var(--otter-text-2);
	text-align: left;
}
.otter-trail[data-finished="true"] .otter-trail-head { display: flex; }
.otter-trail-head .otter-check { color: var(--otter-ok); }
.otter-trail-head[data-kind="fail"] .otter-check, .otter-trail-head[data-kind="stopped"] .otter-check { color: var(--otter-danger); }
.otter-trail-chevron { margin-left: auto; transition: transform 180ms ease; color: var(--otter-text-3); }
.otter-trail[data-open="true"] .otter-trail-chevron { transform: rotate(180deg); }
.otter-trail-steps { display: flex; flex-direction: column; padding: 5px 7px; }
.otter-trail[data-finished="true"] .otter-trail-steps { display: none; border-top: 1px solid var(--otter-border); }
.otter-trail[data-finished="true"][data-open="true"] .otter-trail-steps { display: flex; }

.otter-step { display: flex; align-items: flex-start; gap: 9px; padding: 6px 6px; border-radius: 4px; animation: otter-in 180ms ease both; }
.otter-step-icon { flex: none; width: 16px; height: 16px; margin-top: 1px; display: grid; place-items: center; }
.otter-step-text { font-size: 12.5px; color: var(--otter-text-2); }
.otter-step[data-state="active"] .otter-step-text { color: var(--otter-text); animation: otter-breathe 1.6s ease-in-out infinite; }
@keyframes otter-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

.otter-spinner { width: 13px; height: 13px; }
.otter-spinner circle {
	fill: none; stroke: var(--otter-accent); stroke-width: 2.6; stroke-linecap: round;
	stroke-dasharray: 26 10; transform-origin: center;
	animation: otter-spin 0.9s linear infinite;
}
@keyframes otter-spin { to { transform: rotate(360deg); } }

.otter-check svg, .otter-cross svg { width: 13px; height: 13px; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; fill: none; }
.otter-check svg { stroke: var(--otter-ok); stroke-dasharray: 20; stroke-dashoffset: 20; animation: otter-draw 260ms ease forwards; }
.otter-cross svg { stroke: var(--otter-danger); }
@keyframes otter-draw { to { stroke-dashoffset: 0; } }

/* ---------- consent / confirm cards ---------- */
.otter-card {
	align-self: stretch;
	background: var(--otter-surface);
	border: 1px solid var(--otter-border-strong);
	border-radius: 5px;
	padding: 13px 14px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.otter-card-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 620; }
.otter-card-title svg { width: 15px; height: 15px; flex: none; stroke: var(--otter-accent); fill: none; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.otter-card[data-danger="true"] .otter-card-title svg { stroke: var(--otter-danger); }
.otter-card-body { font-size: 12.5px; color: var(--otter-text-2); }
.otter-card-row { display: flex; gap: 8px; justify-content: flex-end; }
.otter-btn {
	border-radius: 4px; padding: 7px 14px; font-size: 12.5px; font-weight: 600;
	transition: transform 120ms ease, filter 120ms ease, background 120ms ease;
}
.otter-btn:active { transform: scale(0.96); }
.otter-btn-primary { background: var(--otter-accent); color: var(--otter-accent-ink); box-shadow: 0 2px 10px color-mix(in srgb, var(--otter-accent) 35%, transparent); }
.otter-btn-primary:hover { filter: brightness(1.1); }
.otter-btn-danger { background: var(--otter-danger); color: #fff; }
.otter-btn-danger:hover { filter: brightness(1.08); }
.otter-btn-ghost { color: var(--otter-text-2); border: 1px solid var(--otter-border-strong); }
.otter-btn-ghost:hover { background: var(--otter-surface-2); color: var(--otter-text); }
.otter-card-resolved { font-size: 12px; color: var(--otter-text-3); display: flex; align-items: center; gap: 6px; }

/* ---------- composer ---------- */
.otter-composer { padding: 10px 12px 6px; flex: none; }
.otter-composer-box {
	display: flex; align-items: flex-end; gap: 8px;
	background: var(--otter-surface);
	border: 1px solid var(--otter-border);
	border-radius: 5px;
	padding: 8px 8px 8px 13px;
	transition: border-color 140ms ease, box-shadow 140ms ease;
}
.otter-composer-box:focus-within {
	border-color: color-mix(in srgb, var(--otter-accent) 55%, transparent);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--otter-accent) 14%, transparent);
}
.otter-input {
	flex: 1; background: transparent; border: none; outline: none; resize: none;
	color: var(--otter-text); font-size: 13.5px; line-height: 1.45;
	max-height: 92px; min-height: 21px;
}
.otter-input::placeholder { color: var(--otter-text-3); }
.otter-send {
	flex: none; width: 30px; height: 30px; border-radius: 4px;
	background: var(--otter-accent); color: var(--otter-accent-ink);
	display: grid; place-items: center;
	transition: transform 140ms ease, opacity 140ms ease, filter 140ms ease;
}
.otter-send:hover { filter: brightness(1.1); }
.otter-send:active { transform: scale(0.92); }
.otter-send:disabled { opacity: 0.35; cursor: default; filter: none; }
.otter-send svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }

.otter-footer {
	text-align: center; padding: 7px 0 9px; flex: none;
	font-size: 10.5px; color: var(--otter-text-3);
	display: flex; align-items: center; justify-content: center; gap: 4px;
}
.otter-footer svg { width: 9px; height: 9px; fill: var(--otter-text-3); }

/* ---------- working pill ---------- */
.otter-pill {
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
.otter-pill[data-visible="true"] { transform: translate(-50%, 0); opacity: 1; pointer-events: auto; }
.otter-pill-dot { position: relative; width: 8px; height: 8px; flex: none; }
.otter-pill-dot::before, .otter-pill-dot::after {
	content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--otter-accent);
}
.otter-pill-dot::after { animation: otter-ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite; }
@keyframes otter-ping { 0% { transform: scale(1); opacity: 0.7; } 80%, 100% { transform: scale(2.6); opacity: 0; } }
.otter-pill-status { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.otter-pill-divider { width: 1px; height: 16px; background: rgba(255, 255, 255, 0.16); flex: none; }
.otter-pill-stop {
	color: #ff8480; font-weight: 640; font-size: 12.5px;
	padding: 5px 12px; border-radius: 999px;
	transition: background 140ms ease;
}
.otter-pill-stop:hover { background: rgba(255, 132, 128, 0.14); }

/* ---------- cursor + ring (page overlay) ---------- */
.otter-cursor {
	position: fixed;
	top: 0; left: 0;
	z-index: ${zIndex + 2};
	pointer-events: none;
	display: none;
	filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
	--otter-accent: ${accent};
}
.otter-cursor.otter-cursor-visible { display: block; }
.otter-cursor-tag {
	position: absolute;
	top: 18px; left: 15px;
	background: var(--otter-accent);
	color: #fff;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	font-size: 11px;
	font-weight: 620;
	letter-spacing: 0.01em;
	padding: 3px 8px;
	border-radius: 999px;
	white-space: nowrap;
}
.otter-cursor-ripple {
	position: absolute;
	top: -4px; left: -4px;
	width: 30px; height: 30px;
	border-radius: 50%;
	background: color-mix(in srgb, var(--otter-accent) 55%, transparent);
	opacity: 0;
	pointer-events: none;
}

.otter-ring {
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
.otter-ring-visible { opacity: 1; transform: scale(1); }

@media (max-width: 480px) {
	.otter-panel { ${side}: 12px; bottom: 84px; width: calc(100vw - 24px); height: min(560px, calc(100vh - 110px)); }
	.otter-launcher { bottom: 18px; ${side}: 18px; }
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
