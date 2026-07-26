// src/observe.ts
var HOST_ID = "otter-host";
var REF_ATTR = "data-otter-ref";
var MAX_ELEMENTS = 160;
var MAX_HEADINGS = 12;
var CANDIDATE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='switch']",
  "[role='menuitem']",
  "[role='option']",
  "[contenteditable='true']"
].join(", ");
var refByNode = /* @__PURE__ */ new WeakMap();
var refCounter = 0;
function isVisible(el) {
  if (el.closest("[aria-hidden='true']")) return false;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (Number.parseFloat(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}
function roleOf(el) {
  const explicit = el.getAttribute("role");
  if (explicit) {
    if (["button", "link", "tab", "checkbox", "switch", "menuitem", "option"].includes(explicit)) {
      return explicit;
    }
  }
  const tag = el.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (tag === "button" || tag === "summary") return "button";
  if (tag === "select") return "select";
  if (tag === "textarea") return "textbox";
  if (el.isContentEditable) return "textbox";
  if (tag === "input") {
    const type = (el.type || "text").toLowerCase();
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    if (["button", "submit", "reset", "image"].includes(type)) return "button";
    if (type === "range") return "slider";
    return "textbox";
  }
  return "button";
}
function nameOf(el) {
  const aria = el.getAttribute("aria-label");
  if (aria?.trim()) return clip(aria);
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text2 = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.innerText ?? "").join(" ").trim();
    if (text2) return clip(text2);
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const label = (el.labels?.[0]?.innerText ?? "").trim();
    if (label) return clip(label);
    const placeholder = el.getAttribute("placeholder");
    if (placeholder?.trim()) return clip(placeholder);
  }
  const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  if (text) return clip(text);
  return clip(el.getAttribute("title") || el.getAttribute("alt") || el.tagName.toLowerCase());
}
function clip(s) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > 90 ? `${t.slice(0, 87)}\u2026` : t;
}
function stateOf(el, role) {
  const state = {};
  let any = false;
  if ("disabled" in el && el.disabled || el.getAttribute("aria-disabled") === "true") {
    state.disabled = true;
    any = true;
  }
  if (role === "checkbox" || role === "switch" || role === "radio") {
    const checked = el instanceof HTMLInputElement ? el.checked : el.getAttribute("aria-checked") === "true";
    state.checked = checked;
    any = true;
  }
  if (role === "tab" || role === "option") {
    if (el.getAttribute("aria-selected") === "true") {
      state.selected = true;
      any = true;
    }
  }
  const expanded = el.getAttribute("aria-expanded");
  if (expanded !== null) {
    state.expanded = expanded === "true";
    any = true;
  }
  if (role === "textbox" || role === "select") {
    let value = "";
    if (el instanceof HTMLInputElement) {
      value = el.type === "password" ? el.value ? "\u2022\u2022\u2022\u2022" : "" : el.value;
    } else if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      value = el.value;
    } else if (el.isContentEditable) {
      value = el.innerText;
    }
    state.value = value.length > 60 ? `${value.slice(0, 57)}\u2026` : value;
    any = true;
  }
  return any ? state : void 0;
}
function refOf(el) {
  let ref = refByNode.get(el);
  if (ref === void 0) {
    refCounter += 1;
    ref = refCounter;
    refByNode.set(el, ref);
  }
  el.setAttribute(REF_ATTR, String(ref));
  return ref;
}
function findByRef(ref) {
  const el = document.querySelector(`[${REF_ATTR}="${ref}"]`);
  return el instanceof HTMLElement ? el : null;
}
function observe() {
  const host = document.getElementById(HOST_ID);
  const elements = [];
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  for (const node of document.querySelectorAll(CANDIDATE_SELECTOR)) {
    if (elements.length >= MAX_ELEMENTS) break;
    if (host?.contains(node)) continue;
    if (!isVisible(node)) continue;
    if (node instanceof HTMLInputElement && node.type === "hidden") continue;
    const role = roleOf(node);
    const name = nameOf(node);
    if (!name) continue;
    const rect = node.getBoundingClientRect();
    const entry = {
      ref: refOf(node),
      role,
      name,
      inViewport: rect.bottom > 0 && rect.top < viewportH && rect.right > 0 && rect.left < viewportW
    };
    if (node instanceof HTMLAnchorElement && node.href) {
      try {
        const url = new URL(node.href, location.href);
        if (url.origin === location.origin) entry.href = url.pathname;
        else entry.href = url.href.slice(0, 100);
      } catch {
      }
    }
    const state = stateOf(node, role);
    if (state) entry.state = state;
    elements.push(entry);
  }
  const headings = [];
  for (const h of document.querySelectorAll("h1, h2, h3")) {
    if (headings.length >= MAX_HEADINGS) break;
    if (host?.contains(h) || !isVisible(h)) continue;
    const text = clip(h.innerText);
    if (text) headings.push(text);
  }
  return {
    url: location.href,
    path: location.pathname,
    title: document.title,
    headings,
    elements
  };
}

// src/risk.ts
var DESTRUCTIVE_PHRASES = [
  "delete",
  "remove",
  "revoke",
  "deactivate",
  "disable account",
  "close account",
  "cancel subscription",
  "cancel plan",
  "downgrade",
  "upgrade",
  "pay",
  "payment",
  "purchase",
  "buy now",
  "checkout",
  "subscribe",
  "transfer",
  "charge",
  "reset password",
  "change password",
  "sign out everywhere",
  "log out everywhere"
];
function describeRisk(el, extraWords) {
  const text = `${el.innerText ?? ""} ${el.getAttribute("aria-label") ?? ""} ${el.getAttribute("name") ?? ""} ${el.id ?? ""}`.toLowerCase().replace(/\s+/g, " ");
  for (const phrase of [...DESTRUCTIVE_PHRASES, ...extraWords]) {
    if (phrase && text.includes(phrase.toLowerCase())) return phrase;
  }
  return null;
}
function isSensitiveInput(el) {
  return el instanceof HTMLInputElement && el.type === "password";
}

// src/agent.ts
var RESUME_KEY = "otter:resume";
var SOCKET_OPEN_TIMEOUT_MS = 3e3;
var STEP_TIMEOUT_MS = 3e4;
var AgentLoop = class {
  constructor(config, ui, executor) {
    this.config = config;
    this.ui = ui;
    this.executor = executor;
    this.sessionId = null;
    this.consentGranted = false;
    this.running = false;
    this.stopped = false;
    this.aborter = null;
    this.socket = null;
    this.socketOpening = null;
    this.pendingSocketRequests = /* @__PURE__ */ new Map();
  }
  get isRunning() {
    return this.running;
  }
  stop() {
    if (!this.running) return;
    this.stopped = true;
    this.aborter?.abort();
    for (const pending of this.pendingSocketRequests.values()) {
      pending.reject(new Error("stopped"));
    }
    this.pendingSocketRequests.clear();
  }
  /** Entry point for a user message (typed or programmatic). */
  async start(message) {
    if (this.running) return;
    this.ui.user(message);
    await this.run(message, null, void 0);
  }
  /** Continue a task across a full page reload. */
  async resumeIfPending() {
    const raw = sessionStorage.getItem(RESUME_KEY);
    if (!raw) return;
    sessionStorage.removeItem(RESUME_KEY);
    let state;
    try {
      state = JSON.parse(raw);
    } catch {
      return;
    }
    this.sessionId = state.sessionId;
    this.consentGranted = state.consent;
    const liveTrail = this.ui.restoreTranscript(state.transcript);
    if (state.panelOpen) this.ui.open();
    await new Promise((r) => setTimeout(r, 600));
    await this.run(void 0, liveTrail, { ok: true });
  }
  persistForHardNav() {
    if (!this.sessionId) return;
    const state = {
      sessionId: this.sessionId,
      consent: this.consentGranted,
      transcript: this.ui.dumpTranscript(),
      panelOpen: this.ui.isOpen
    };
    sessionStorage.setItem(RESUME_KEY, JSON.stringify(state));
  }
  async run(message, trail, lastAction) {
    this.running = true;
    this.stopped = false;
    this.ui.setBusy(true);
    let steps = trail?.count ?? 0;
    const ensureTrail = () => {
      trail ?? (trail = this.ui.trail());
      return trail;
    };
    try {
      while (true) {
        if (this.stopped)
          return this.finish(
            trail,
            "stopped",
            "Stopped. Nothing else will be touched."
          );
        this.ui.typing(steps === 0 && !lastAction);
        let resp;
        try {
          resp = await this.requestStep(message, lastAction);
        } catch {
          if (this.stopped)
            return this.finish(
              trail,
              "stopped",
              "Stopped. Nothing else will be touched."
            );
          this.ui.typing(false);
          return this.finish(
            trail,
            "fail",
            "I couldn't reach the agent backend. Check your connection and try again.",
            true
          );
        }
        this.ui.typing(false);
        message = void 0;
        lastAction = void 0;
        this.sessionId = resp.sessionId;
        const action = resp.action;
        if (action.type === "say") {
          trail?.finish("done");
          this.ui.agent(action.text);
          return;
        }
        if (action.type === "done") {
          this.finish(trail, "done", action.summary);
          return;
        }
        if (action.type === "fail") {
          this.finish(trail, "fail", action.reason, true);
          return;
        }
        if (!this.consentGranted) {
          const allowed = await this.ui.consent();
          if (!allowed) {
            return this.finish(
              trail,
              "stopped",
              "No problem \u2014 I won't touch anything. Ask me whenever you're ready."
            );
          }
          this.consentGranted = true;
        }
        const risk = this.riskLabelFor(action);
        if (risk) {
          this.ui.pill(false);
          const approved = await this.ui.confirmDanger(risk);
          if (!approved) {
            return this.finish(
              trail,
              "stopped",
              "Skipped that step and stopped there \u2014 tell me how you'd like to proceed."
            );
          }
        }
        if (this.stopped)
          return this.finish(
            trail,
            "stopped",
            "Stopped. Nothing else will be touched."
          );
        steps += 1;
        if (steps > this.config.maxSteps) {
          return this.finish(
            trail,
            "fail",
            "I hit my safety cap on steps for one task. Rephrase or break it down and I'll keep going.",
            true
          );
        }
        this.ui.pill(true, resp.status);
        const handle = ensureTrail().step(resp.status ?? defaultStatus(action));
        if (action.type === "navigate" || action.type === "click")
          this.persistForHardNav();
        const result = await this.executor.execute(action);
        handle.setDone(result.ok);
        if (result.hardNav && action.type === "navigate") {
          location.assign(action.path);
          return;
        }
        if (result.hardNav) return;
        sessionStorage.removeItem(RESUME_KEY);
        lastAction = { ok: result.ok, error: result.error };
      }
    } finally {
      this.running = false;
      this.ui.setBusy(false);
      this.ui.pill(false);
      this.ui.typing(false);
    }
  }
  finish(trail, kind, text, error = false) {
    trail?.finish(kind);
    this.ui.agent(text, { error });
    this.ui.pill(false);
  }
  riskLabelFor(action) {
    if (action.type === "click") {
      const el = findByRef(action.ref);
      if (!el) return null;
      return describeRisk(el, this.config.riskyWords);
    }
    if (action.type === "fill") {
      const el = findByRef(action.ref);
      if (!el) return null;
      if (isSensitiveInput(el)) return "fill a password field";
      return describeRisk(el, this.config.riskyWords);
    }
    return null;
  }
  async requestStep(message, lastAction) {
    if (this.config.wsEndpoint) {
      try {
        return await this.requestStepViaSocket(message, lastAction);
      } catch {
      }
    }
    return this.requestStepViaHttp(message, lastAction);
  }
  stepPayload(message, lastAction) {
    return {
      sessionId: this.sessionId ?? void 0,
      message,
      snapshot: observe(),
      lastAction: lastAction ? { ok: lastAction.ok, error: lastAction.error } : void 0,
      user: this.config.user
    };
  }
  async requestStepViaHttp(message, lastAction) {
    this.aborter = new AbortController();
    const timeout = setTimeout(() => this.aborter?.abort(), STEP_TIMEOUT_MS);
    try {
      const url = new URL(`${this.config.endpoint}/step`, window.location.href);
      if (this.config.publicKey)
        url.searchParams.set("key", this.config.publicKey);
      const headers = {
        "content-type": "application/json"
      };
      if (this.config.publicKey) headers["x-otter-key"] = this.config.publicKey;
      const res = await fetch(url, {
        method: "POST",
        headers,
        signal: this.aborter.signal,
        body: JSON.stringify(this.stepPayload(message, lastAction))
      });
      if (!res.ok) throw new Error(`step_http_${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timeout);
      this.aborter = null;
    }
  }
  async ensureSocket() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN)
      return this.socket;
    if (this.socketOpening) return this.socketOpening;
    const endpoint = this.config.wsEndpoint;
    if (!endpoint) throw new Error("no_ws_endpoint");
    const url = new URL(endpoint, window.location.href);
    if (this.config.publicKey)
      url.searchParams.set("key", this.config.publicKey);
    this.socketOpening = new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("ws_open_timeout"));
      }, SOCKET_OPEN_TIMEOUT_MS);
      ws.addEventListener(
        "open",
        () => {
          clearTimeout(timeout);
          this.socket = ws;
          resolve(ws);
        },
        { once: true }
      );
      ws.addEventListener(
        "error",
        () => {
          clearTimeout(timeout);
          reject(new Error("ws_error"));
        },
        { once: true }
      );
      ws.addEventListener("message", (event) => this.onSocketMessage(event));
      ws.addEventListener("close", () => {
        if (this.socket === ws) this.socket = null;
        for (const pending of this.pendingSocketRequests.values()) {
          pending.reject(new Error("ws_closed"));
        }
        this.pendingSocketRequests.clear();
      });
    }).finally(() => {
      this.socketOpening = null;
    });
    return this.socketOpening;
  }
  onSocketMessage(event) {
    let parsed;
    try {
      parsed = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (!parsed.requestId) return;
    const pending = this.pendingSocketRequests.get(parsed.requestId);
    if (!pending) return;
    this.pendingSocketRequests.delete(parsed.requestId);
    if (parsed.type === "step_result" && parsed.result) {
      pending.resolve(parsed.result);
    } else {
      pending.reject(new Error(parsed.error ?? "ws_step_failed"));
    }
  }
  async requestStepViaSocket(message, lastAction) {
    const ws = await this.ensureSocket();
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingSocketRequests.delete(requestId);
        reject(new Error("ws_step_timeout"));
      }, STEP_TIMEOUT_MS);
      this.pendingSocketRequests.set(requestId, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        }
      });
      ws.send(
        JSON.stringify({
          type: "step",
          requestId,
          ...this.stepPayload(message, lastAction)
        })
      );
    });
  }
};
function defaultStatus(action) {
  switch (action.type) {
    case "click":
      return "Clicking\u2026";
    case "fill":
      return "Typing\u2026";
    case "navigate":
      return "Navigating\u2026";
    case "scroll":
      return "Showing you\u2026";
    default:
      return "Working\u2026";
  }
}

// src/cursor.ts
var EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
var Cursor = class {
  constructor(root, reducedMotion, name) {
    this.reducedMotion = reducedMotion;
    this.x = 0;
    this.y = 0;
    this.visible = false;
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
  async show(x, y) {
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
          { opacity: 1, transform: `translate3d(${x}px, ${y}px, 0) scale(1)` }
        ],
        { duration: 260, easing: EASE }
      ).finished.catch(() => {
      });
    }
  }
  async moveTo(x, y) {
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
      easing: EASE
    }).finished.catch(() => {
    });
  }
  async press() {
    const ripple = this.el.querySelector(".otter-cursor-ripple");
    if (!ripple) return;
    if (this.reducedMotion) return;
    const squeeze = this.el.animate(
      [
        { transform: `translate3d(${this.x}px, ${this.y}px, 0) scale(1)` },
        { transform: `translate3d(${this.x}px, ${this.y}px, 0) scale(0.86)`, offset: 0.4 },
        { transform: `translate3d(${this.x}px, ${this.y}px, 0) scale(1)` }
      ],
      { duration: 240, easing: "ease-out" }
    );
    ripple.animate(
      [
        { opacity: 0.55, transform: "scale(0.3)" },
        { opacity: 0, transform: "scale(2.4)" }
      ],
      { duration: 420, easing: "ease-out" }
    );
    await squeeze.finished.catch(() => {
    });
  }
  hide() {
    if (!this.visible) return;
    this.visible = false;
    const finish = () => this.el.classList.remove("otter-cursor-visible");
    if (this.reducedMotion) {
      finish();
      return;
    }
    this.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-out" }).finished.then(finish).catch(finish);
  }
  destroy() {
    this.el.remove();
  }
};
var TargetRing = class {
  constructor(root) {
    this.el = document.createElement("div");
    this.el.className = "otter-ring";
    root.appendChild(this.el);
  }
  showOver(rect) {
    const pad = 5;
    this.el.style.top = `${rect.top - pad}px`;
    this.el.style.left = `${rect.left - pad}px`;
    this.el.style.width = `${rect.width + pad * 2}px`;
    this.el.style.height = `${rect.height + pad * 2}px`;
    this.el.classList.add("otter-ring-visible");
  }
  hide() {
    this.el.classList.remove("otter-ring-visible");
  }
  destroy() {
    this.el.remove();
  }
};
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// src/executor.ts
var SETTLE_QUIET_MS = 350;
var SETTLE_MAX_MS = 2600;
var Executor = class {
  constructor(cursor, ring, reducedMotion) {
    this.cursor = cursor;
    this.ring = ring;
    this.reducedMotion = reducedMotion;
  }
  async execute(action) {
    switch (action.type) {
      case "click":
        return this.click(action.ref);
      case "fill":
        return this.fill(action.ref, action.value);
      case "scroll":
        return this.scroll(action.ref);
      case "navigate":
        return this.navigate(action.path);
      default:
        return { ok: false, error: `not an executable action: ${action.type}` };
    }
  }
  async approach(ref) {
    const el = findByRef(ref);
    if (!el) return { error: "element no longer exists on this page" };
    el.scrollIntoView({ behavior: this.reducedMotion ? "auto" : "smooth", block: "center" });
    await wait(this.reducedMotion ? 60 : 380);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { error: "element is not visible" };
    this.ring.showOver(rect);
    await this.cursor.moveTo(rect.left + rect.width / 2, rect.top + rect.height / 2);
    await wait(this.reducedMotion ? 30 : 160);
    return el;
  }
  async click(ref) {
    const target = await this.approach(ref);
    if (!(target instanceof HTMLElement)) return { ok: false, error: target.error };
    if ("disabled" in target && target.disabled || target.getAttribute("aria-disabled") === "true") {
      this.ring.hide();
      return { ok: false, error: "element is disabled" };
    }
    await this.cursor.press();
    const hardNav = willHardNavigate(target);
    fireClick(target);
    this.ring.hide();
    if (hardNav) return { ok: true, hardNav: true };
    await settle();
    return { ok: true };
  }
  async fill(ref, value) {
    const target = await this.approach(ref);
    if (!(target instanceof HTMLElement)) return { ok: false, error: target.error };
    await this.cursor.press();
    target.focus();
    if (target instanceof HTMLSelectElement) {
      const option = Array.from(target.options).find(
        (o) => o.value === value || o.text.trim().toLowerCase() === value.trim().toLowerCase()
      );
      if (!option) {
        this.ring.hide();
        return { ok: false, error: `no option matching "${value}"` };
      }
      setNativeValue(target, option.value);
      target.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      setNativeValue(target, "");
      target.dispatchEvent(new Event("input", { bubbles: true }));
      const perChar = this.reducedMotion ? 0 : Math.min(24, 700 / Math.max(value.length, 1));
      for (let i = 1; i <= value.length; i++) {
        setNativeValue(target, value.slice(0, i));
        target.dispatchEvent(new Event("input", { bubbles: true }));
        if (perChar > 0) await wait(perChar);
      }
      target.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (target.isContentEditable) {
      target.innerText = value;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      this.ring.hide();
      return { ok: false, error: "element is not fillable" };
    }
    this.ring.hide();
    await settle();
    return { ok: true };
  }
  async scroll(ref) {
    const el = findByRef(ref);
    if (!el) return { ok: false, error: "element no longer exists on this page" };
    el.scrollIntoView({ behavior: this.reducedMotion ? "auto" : "smooth", block: "center" });
    await wait(this.reducedMotion ? 60 : 420);
    const rect = el.getBoundingClientRect();
    this.ring.showOver(rect);
    await this.cursor.moveTo(rect.left + rect.width / 2, rect.top + rect.height / 2);
    await wait(900);
    this.ring.hide();
    return { ok: true };
  }
  async navigate(path) {
    const links = document.querySelectorAll("a[href]");
    for (const link of links) {
      try {
        const url = new URL(link.href, location.href);
        if (url.origin === location.origin && url.pathname === path) {
          const rect = link.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            this.ring.showOver(rect);
            await this.cursor.moveTo(rect.left + rect.width / 2, rect.top + rect.height / 2);
            await this.cursor.press();
            fireClick(link);
            this.ring.hide();
            await settle();
            return { ok: true };
          }
        }
      } catch {
      }
    }
    return { ok: true, hardNav: true };
  }
};
function fireClick(el) {
  const opts = { bubbles: true, cancelable: true, view: window };
  el.dispatchEvent(new PointerEvent("pointerdown", opts));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new PointerEvent("pointerup", opts));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.click();
}
function setNativeValue(el, value) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function settle() {
  return new Promise((resolve) => {
    let quietTimer;
    const maxTimer = window.setTimeout(() => {
      observer.disconnect();
      resolve();
    }, SETTLE_MAX_MS);
    const done = () => {
      window.clearTimeout(maxTimer);
      observer.disconnect();
      resolve();
    };
    const observer = new MutationObserver(() => {
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(done, SETTLE_QUIET_MS);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    quietTimer = window.setTimeout(done, SETTLE_QUIET_MS);
  });
}
function willHardNavigate(el) {
  const anchor = el.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.target === "_blank") return false;
  try {
    const url = new URL(anchor.href, location.href);
    return url.origin !== location.origin;
  } catch {
    return false;
  }
}

// src/styles.ts
function buildStyles(accent, zIndex, side) {
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
/* Children of an overflowing flex column shrink by default \u2014 the trail box
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

// src/ui.ts
var GLYPH = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c.75 5.05 4.7 9 9.75 9.75-5.05.75-9 4.7-9.75 9.75-.75-5.05-4.7-9-9.75-9.75C7.3 11.2 11.25 7.25 12 2.2z"/></svg>`;
var ICON_MINIMIZE = `<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>`;
var ICON_NEW = `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`;
var ICON_SEND = `<svg viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>`;
var ICON_SHIELD = `<svg viewBox="0 0 24 24"><path d="M12 3l7.5 3v5.2c0 4.6-3.2 8.2-7.5 9.8-4.3-1.6-7.5-5.2-7.5-9.8V6L12 3z"/><path d="M9.2 12.2l2 2 3.6-4"/></svg>`;
var ICON_WARN = `<svg viewBox="0 0 24 24"><path d="M12 4L2.8 19.5h18.4L12 4z"/><path d="M12 10v4.2M12 17.2v.2"/></svg>`;
var ICON_CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
var ICON_CROSS = `<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>`;
var ICON_CHEVRON = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"/></svg>`;
var SPINNER = `<svg class="otter-spinner" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/></svg>`;
var WidgetUI = class {
  constructor(config, callbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.typingEl = null;
    this.themeQuery = null;
    this.transcript = [];
    this.host = document.createElement("div");
    this.host.id = HOST_ID;
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = buildStyles(
      config.accent,
      config.zIndex,
      config.position === "bottom-left" ? "left" : "right"
    );
    this.shadow.appendChild(style);
    this.root = document.createElement("div");
    this.root.className = "otter-root";
    this.root.innerHTML = `
			<button class="otter-launcher" type="button" aria-label="Open ${esc(config.name)}">${GLYPH}</button>
			<section class="otter-panel" data-open="false" role="dialog" aria-label="${esc(config.name)}">
				<header class="otter-header">
					<div class="otter-brand">
						<div class="otter-avatars" aria-label="${esc(config.name)} online">
							<span class="otter-brand-dot">${GLYPH}</span>
							<span class="otter-avatar-simple">AI</span>
						</div>
						<div><h1>${esc(config.name)} Support</h1><p><i></i> Online now</p></div>
					</div>
					<div class="otter-header-actions">
						<button class="otter-icon-btn" type="button" data-act="new" aria-label="New conversation">${ICON_NEW}</button>
						<button class="otter-icon-btn" type="button" data-act="minimize" aria-label="Minimize">${ICON_MINIMIZE}</button>
					</div>
				</header>
				<div class="otter-messages"></div>
				<form class="otter-composer">
					<div class="otter-composer-box">
						<textarea class="otter-input" rows="1" placeholder="What do you need done?" aria-label="Message"></textarea>
						<button class="otter-send" type="submit" aria-label="Send" disabled>${ICON_SEND}</button>
					</div>
				</form>
				${config.hideBranding ? "" : `<footer class="otter-footer">${GLYPH}<span>Powered by ${esc(config.name)}</span></footer>`}
			</section>
			<div class="otter-pill" data-visible="false">
				<span class="otter-pill-dot"></span>
				<span class="otter-pill-status">${esc(config.name)} is working\u2026</span>
				<span class="otter-pill-divider"></span>
				<button class="otter-pill-stop" type="button">Stop</button>
			</div>`;
    this.shadow.appendChild(this.root);
    this.panel = this.q(".otter-panel");
    this.messages = this.q(".otter-messages");
    this.input = this.q(".otter-input");
    this.sendBtn = this.q(".otter-send");
    this.pillEl = this.q(".otter-pill");
    this.pillStatus = this.q(".otter-pill-status");
    this.applyTheme();
    this.wire();
  }
  q(sel) {
    return this.root.querySelector(sel);
  }
  applyTheme() {
    const set = (t) => this.root.setAttribute("data-theme", t);
    if (this.config.theme === "auto") {
      this.themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
      set(this.themeQuery.matches ? "dark" : "light");
      this.themeQuery.addEventListener(
        "change",
        (e) => set(e.matches ? "dark" : "light")
      );
    } else {
      set(this.config.theme);
    }
  }
  wire() {
    this.q(".otter-launcher").addEventListener("click", () => this.toggle());
    this.q("[data-act='minimize']").addEventListener(
      "click",
      () => this.close()
    );
    this.q("[data-act='new']").addEventListener("click", () => this.reset());
    this.q(".otter-pill-stop").addEventListener(
      "click",
      () => this.callbacks.onStop()
    );
    const form = this.q(".otter-composer");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.submit();
    });
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.submit();
      }
      if (e.key === "Escape") this.close();
    });
    this.input.addEventListener("input", () => {
      this.sendBtn.disabled = !this.input.value.trim();
      this.input.style.height = "auto";
      this.input.style.height = `${Math.min(this.input.scrollHeight, 92)}px`;
    });
  }
  submit() {
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = "";
    this.input.style.height = "auto";
    this.sendBtn.disabled = true;
    this.callbacks.onSubmit(text);
  }
  // ---------- panel state ----------
  get isOpen() {
    return this.panel.getAttribute("data-open") === "true";
  }
  open() {
    this.panel.setAttribute("data-open", "true");
    if (!this.messages.children.length) {
      this.agent(
        `Hi! I'm ${this.config.name}. Tell me what you need \u2014 I'll do it right here on the page.`,
        { record: false }
      );
    }
    setTimeout(() => this.input.focus(), 120);
  }
  close() {
    this.panel.setAttribute("data-open", "false");
  }
  toggle() {
    this.isOpen ? this.close() : this.open();
  }
  reset() {
    this.messages.innerHTML = "";
    this.transcript = [];
    this.agent(`Fresh start. What can I do for you?`, { record: false });
  }
  setBusy(busy) {
    this.input.disabled = busy;
    if (!busy) {
      this.sendBtn.disabled = !this.input.value.trim();
      this.input.focus();
    } else {
      this.sendBtn.disabled = true;
    }
  }
  // ---------- messages ----------
  scrollDown() {
    this.messages.scrollTop = this.messages.scrollHeight;
  }
  user(text, opts = {}) {
    const el = document.createElement("div");
    el.className = "otter-msg otter-msg-user";
    el.textContent = text;
    this.messages.appendChild(el);
    this.scrollDown();
    if (opts.record !== false) this.transcript.push({ kind: "user", text });
  }
  agent(text, opts = {}) {
    const el = document.createElement("div");
    el.className = `otter-msg otter-msg-agent${opts.error ? " otter-msg-error" : ""}`;
    el.textContent = text;
    this.messages.appendChild(el);
    this.scrollDown();
    if (opts.record !== false) {
      this.transcript.push({
        kind: opts.error ? "agent-error" : "agent",
        text
      });
    }
  }
  typing(show) {
    if (show && !this.typingEl) {
      this.typingEl = document.createElement("div");
      this.typingEl.className = "otter-typing";
      this.typingEl.innerHTML = "<span></span><span></span><span></span>";
      this.messages.appendChild(this.typingEl);
      this.scrollDown();
    } else if (!show && this.typingEl) {
      this.typingEl.remove();
      this.typingEl = null;
    }
  }
  // ---------- step trail ----------
  trail(restored) {
    const entry = {
      kind: "trail",
      steps: [...restored ?? []],
      finished: null
    };
    this.transcript.push(entry);
    const box = document.createElement("div");
    box.className = "otter-trail";
    box.innerHTML = `
			<button class="otter-trail-head" type="button">
				<span class="otter-check">${ICON_CHECK.replace("<svg ", '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" ')}</span>
				<span class="otter-trail-count"></span>
				<span class="otter-trail-chevron">${ICON_CHEVRON}</span>
			</button>
			<div class="otter-trail-steps"></div>`;
    this.messages.appendChild(box);
    const stepsEl = box.querySelector(".otter-trail-steps");
    const head = box.querySelector(".otter-trail-head");
    head.addEventListener("click", () => {
      box.setAttribute(
        "data-open",
        box.getAttribute("data-open") === "true" ? "false" : "true"
      );
    });
    this.scrollDown();
    let count = 0;
    const addRow = (status) => {
      count += 1;
      const row = document.createElement("div");
      row.className = "otter-step";
      row.setAttribute("data-state", "active");
      row.innerHTML = `<span class="otter-step-icon">${SPINNER}</span><span class="otter-step-text"></span>`;
      row.querySelector(".otter-step-text").textContent = status;
      stepsEl.appendChild(row);
      this.scrollDown();
      return {
        row,
        icon: row.querySelector(".otter-step-icon")
      };
    };
    const setIcon = (icon, row, ok) => {
      row.setAttribute("data-state", ok ? "done" : "error");
      icon.innerHTML = ok ? `<span class="otter-check">${svgStroke(ICON_CHECK)}</span>` : `<span class="otter-cross">${svgStroke(ICON_CROSS)}</span>`;
    };
    for (const s of entry.steps ?? []) {
      const { row, icon } = addRow(s.status);
      setIcon(icon, row, s.ok);
    }
    const ui = this;
    return {
      get count() {
        return count;
      },
      step(status) {
        const { row, icon } = addRow(status);
        const rec = { status, ok: true };
        entry.steps.push(rec);
        ui.pillStatus.textContent = status;
        return {
          setDone(ok) {
            rec.ok = ok;
            setIcon(icon, row, ok);
          }
        };
      },
      finish(kind) {
        entry.finished = kind;
        if (count === 0) {
          box.remove();
          return;
        }
        box.setAttribute("data-finished", "true");
        head.setAttribute("data-kind", kind);
        const label = kind === "done" ? `${count} step${count === 1 ? "" : "s"} completed` : kind === "stopped" ? `Stopped after ${count} step${count === 1 ? "" : "s"}` : `Stopped \u2014 ${count} step${count === 1 ? "" : "s"} attempted`;
        box.querySelector(".otter-trail-count").textContent = label;
        if (kind !== "done") {
          const check = box.querySelector(
            ".otter-trail-head .otter-check"
          );
          check.innerHTML = svgStroke(ICON_CROSS);
        }
        ui.scrollDown();
      }
    };
  }
  // ---------- cards ----------
  card(opts) {
    return new Promise((resolve) => {
      const el = document.createElement("div");
      el.className = "otter-card";
      if (opts.danger) el.setAttribute("data-danger", "true");
      el.innerHTML = `
				<div class="otter-card-title">${opts.icon}<span></span></div>
				<div class="otter-card-body"></div>
				<div class="otter-card-row">
					<button class="otter-btn otter-btn-ghost" type="button"></button>
					<button class="otter-btn ${opts.danger ? "otter-btn-danger" : "otter-btn-primary"}" type="button"></button>
				</div>`;
      el.querySelector(".otter-card-title span").textContent = opts.title;
      el.querySelector(".otter-card-body").textContent = opts.body;
      const deny = el.querySelector(".otter-btn-ghost");
      const allow = el.querySelectorAll(".otter-btn")[1];
      deny.textContent = opts.denyLabel;
      allow.textContent = opts.confirmLabel;
      const settle2 = (val) => {
        el.innerHTML = val ? `<div class="otter-card-resolved"><span class="otter-check">${svgStroke(ICON_CHECK)}</span>${esc(opts.resolvedText)}</div>` : `<div class="otter-card-resolved">${esc(opts.denyLabel)} \u2014 nothing was touched.</div>`;
        resolve(val);
      };
      deny.addEventListener("click", () => settle2(false));
      allow.addEventListener("click", () => settle2(true));
      this.messages.appendChild(el);
      this.scrollDown();
    });
  }
  consent() {
    return this.card({
      icon: ICON_SHIELD,
      title: `${this.config.name} wants to act on this page`,
      body: "It will click and type for you, showing every step as it goes. You can stop it at any time.",
      confirmLabel: "Allow",
      denyLabel: "Deny",
      resolvedText: "Allowed for this conversation"
    });
  }
  confirmDanger(label) {
    return this.card({
      danger: true,
      icon: ICON_WARN,
      title: "This step needs your OK",
      body: `The next action is "${label}" \u2014 it may be hard to undo, so I want your explicit go-ahead.`,
      confirmLabel: "Proceed",
      denyLabel: "Skip it",
      resolvedText: "Approved"
    });
  }
  // ---------- working pill ----------
  pill(show, status) {
    if (status) this.pillStatus.textContent = status;
    else if (show)
      this.pillStatus.textContent = `${this.config.name} is working\u2026`;
    this.pillEl.setAttribute("data-visible", show ? "true" : "false");
  }
  // ---------- hard-nav persistence ----------
  dumpTranscript() {
    return JSON.stringify(this.transcript.slice(-40));
  }
  restoreTranscript(json) {
    let entries;
    try {
      entries = JSON.parse(json);
    } catch {
      return null;
    }
    this.messages.innerHTML = "";
    this.transcript = [];
    let liveTrail = null;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.kind === "user") this.user(e.text ?? "");
      else if (e.kind === "agent") this.agent(e.text ?? "");
      else if (e.kind === "agent-error")
        this.agent(e.text ?? "", { error: true });
      else if (e.kind === "trail") {
        const t = this.trail(e.steps ?? []);
        if (e.finished) t.finish(e.finished);
        else if (i === entries.length - 1) liveTrail = t;
        else t.finish("done");
      }
    }
    return liveTrail;
  }
  destroy() {
    this.host.remove();
  }
};
function esc(s) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
function svgStroke(icon) {
  return icon.replace(
    "<svg ",
    '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" '
  );
}

// src/index.ts
var active = null;
function init(userConfig = {}) {
  if (active) {
    console.warn(
      "[otter-sdk] init() called while already active \u2014 reusing existing instance."
    );
    return active;
  }
  if (typeof document === "undefined") {
    throw new Error("[otter-sdk] init() must run in a browser.");
  }
  const config = {
    endpoint: (userConfig.endpoint ?? "/api/agent").replace(/\/$/, ""),
    wsEndpoint: userConfig.wsEndpoint,
    publicKey: userConfig.publicKey?.trim() || void 0,
    name: userConfig.name ?? "Otter",
    accent: userConfig.accent ?? "#69D8C8",
    theme: userConfig.theme ?? "dark",
    position: userConfig.position ?? "bottom-right",
    maxSteps: userConfig.maxSteps ?? 20,
    zIndex: userConfig.zIndex ?? 2147483e3,
    riskyWords: userConfig.riskyWords ?? [],
    hideBranding: userConfig.hideBranding ?? false,
    user: userConfig.user ?? {}
  };
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  let loop;
  const ui = new WidgetUI(config, {
    onSubmit: (text) => void loop.start(text),
    onStop: () => loop.stop()
  });
  const cursor = new Cursor(ui.shadow, reducedMotion, config.name);
  const ring = new TargetRing(ui.shadow);
  const executor = new Executor(cursor, ring, reducedMotion);
  loop = new AgentLoop(config, ui, executor);
  void loop.resumeIfPending().finally(() => cursor.hide());
  const instance = {
    open: () => ui.open(),
    close: () => ui.close(),
    ask(message) {
      ui.open();
      if (!loop.isRunning) void loop.start(message);
    },
    destroy() {
      loop.stop();
      cursor.destroy();
      ring.destroy();
      ui.destroy();
      active = null;
    }
  };
  active = instance;
  return instance;
}
export {
  init
};
//# sourceMappingURL=otter-sdk.esm.js.map
