import { describe, expect, test } from "bun:test";
import {
	acceptFastPath,
	analyzeMessage,
	analyzePage,
	candidateElements,
	guardAction,
	isDestructiveLabel,
	type JevConfig,
	literalOverlap,
	systemOne,
} from "./jev.js";
import type { PageSnapshot } from "./types.js";

const cfg: JevConfig = { apiKey: "k", jobs: ["router", "guard", "injection", "memory", "fastpath", "done"] };

const snapshot: PageSnapshot = {
	url: "https://x/demo",
	path: "/demo",
	title: "Cordant",
	headings: ["Dashboard"],
	elements: [
		{ ref: 1, role: "link", name: "My settings" },
		{ ref: 2, role: "link", name: "Security" },
		{ ref: 3, role: "button", name: "Enable 2FA" },
		{ ref: 4, role: "button", name: "Delete workspace" },
		{ ref: 5, role: "textbox", name: "Search" },
	],
};

function mockFetch(answers: unknown, status = 200): typeof fetch {
	return (async () =>
		new Response(JSON.stringify({ answers }), { status })) as unknown as typeof fetch;
}

describe("systemOne", () => {
	test("returns answers on 200", async () => {
		const out = await systemOne(cfg, "s", { q: { type: "noul", instructions: "?" } }, mockFetch({ q: { type: "noul", noul: 0.2 } }));
		expect(out?.q).toEqual({ type: "noul", noul: 0.2 });
	});

	test("returns null on 4xx and never throws", async () => {
		expect(await systemOne(cfg, "s", {}, mockFetch({}, 422))).toBeNull();
		const boom = (async () => {
			throw new Error("network");
		}) as unknown as typeof fetch;
		expect(await systemOne(cfg, "s", {}, boom)).toBeNull();
	});

	test("retries once on 429 then succeeds", async () => {
		let calls = 0;
		const f = (async () => {
			calls++;
			return calls === 1
				? new Response("{}", { status: 429 })
				: new Response(JSON.stringify({ answers: { q: { type: "noul", noul: 1 } } }));
		}) as unknown as typeof fetch;
		const out = await systemOne(cfg, "s", {}, f);
		expect(calls).toBe(2);
		expect(out?.q).toBeDefined();
	});

	test("hits the OpenRouter systemone route by default", async () => {
		let url = "";
		const f = (async (u: string) => {
			url = u;
			return new Response(JSON.stringify({ answers: {} }));
		}) as unknown as typeof fetch;
		await systemOne(cfg, "s", {}, f);
		expect(url).toBe("https://openrouter.ai/api/v1/systemone");
	});
});

describe("literal matching", () => {
	test("overlap needs a shared meaningful token", () => {
		expect(literalOverlap("I want to turn on 2FA", "Enable 2FA")).toBe(true);
		expect(literalOverlap("change my password", "Enable 2FA")).toBe(false);
		expect(literalOverlap("open security settings", "Security")).toBe(true);
	});

	test("destructive labels are detected", () => {
		expect(isDestructiveLabel("Delete workspace")).toBe(true);
		expect(isDestructiveLabel("Cancel plan")).toBe(true);
		expect(isDestructiveLabel("Enable 2FA")).toBe(false);
	});

	test("candidate elements keep only actionable, named, enabled controls", () => {
		const refs = candidateElements(snapshot).map((e) => e.ref);
		expect(refs).toEqual([1, 2, 3, 4]);
	});
});

describe("fast-path gate", () => {
	const pickAnswer = (choice: string, confidence: number) => ({
		pick: { type: "choice", choice, confidence, probabilities: {} },
	});

	test("accepts a confident literal match", async () => {
		const a = await analyzePage(cfg, snapshot, { goal: "turn on 2FA", wantDone: false }, mockFetch(pickAnswer("3", 0.95)));
		expect(acceptFastPath(a, "turn on 2FA")).toBe(true);
		expect(a.pick?.ref).toBe(3);
	});

	test("rejects low confidence", async () => {
		const a = await analyzePage(cfg, snapshot, { goal: "turn on 2FA", wantDone: false }, mockFetch(pickAnswer("3", 0.7)));
		expect(acceptFastPath(a, "turn on 2FA")).toBe(false);
	});

	test("rejects a pick with no literal overlap (the open-ended-planning failure)", async () => {
		const a = await analyzePage(cfg, snapshot, { goal: "turn on 2FA", wantDone: false }, mockFetch(pickAnswer("1", 0.9)));
		expect(acceptFastPath(a, "turn on 2FA")).toBe(false);
	});

	test("rejects destructive labels even on a literal match", async () => {
		const a = await analyzePage(cfg, snapshot, { goal: "delete workspace", wantDone: false }, mockFetch(pickAnswer("4", 0.99)));
		expect(acceptFastPath(a, "delete workspace")).toBe(false);
	});

	test("'none' and unknown refs yield no pick", async () => {
		const none = await analyzePage(cfg, snapshot, { goal: "x", wantDone: false }, mockFetch(pickAnswer("none", 0.9)));
		expect(none.pick).toBeUndefined();
		const bogus = await analyzePage(cfg, snapshot, { goal: "x", wantDone: false }, mockFetch(pickAnswer("999", 0.9)));
		expect(bogus.pick).toBeUndefined();
	});

	test("returns empty analysis when Jev is unreachable", async () => {
		const boom = (async () => {
			throw new Error("down");
		}) as unknown as typeof fetch;
		const a = await analyzePage(cfg, snapshot, { goal: "turn on 2FA", wantDone: true }, boom);
		expect(a).toEqual({ injection: undefined, achieved: undefined });
	});
});

describe("message + guard jobs", () => {
	test("intent and memory are parsed", async () => {
		const out = await analyzeMessage(
			cfg,
			"I prefer dark mode",
			{ memory: true },
			mockFetch({
				intent: { type: "choice", choice: "ui_action", confidence: 0.9 },
				keep: { type: "noul", noul: 0.94 },
			}),
		);
		expect(out.intent).toEqual({ value: "ui_action", confidence: 0.9 });
		expect(out.remember).toBe(0.94);
	});

	test("unknown intent labels are ignored", async () => {
		const out = await analyzeMessage(cfg, "hi", { memory: false }, mockFetch({ intent: { type: "choice", choice: "bogus", confidence: 1 } }));
		expect(out.intent).toBeUndefined();
	});

	test("disabled jobs make no request", async () => {
		let called = false;
		const f = (async () => {
			called = true;
			return new Response("{}");
		}) as unknown as typeof fetch;
		await analyzeMessage({ apiKey: "k", jobs: [] }, "hi", { memory: true }, f);
		expect(called).toBe(false);
		expect(await guardAction({ apiKey: "k", jobs: [] }, "g", { kind: "click" }, "/", f)).toBeUndefined();
	});

	test("guard returns the risk score", async () => {
		const risk = await guardAction(
			cfg,
			"turn on 2FA",
			{ kind: "click", element: snapshot.elements[3] },
			"/demo",
			mockFetch({ risky: { type: "noul", noul: 0.97 } }),
		);
		expect(risk).toBe(0.97);
	});
});
