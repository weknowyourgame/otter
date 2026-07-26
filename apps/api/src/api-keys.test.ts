import { describe, expect, it } from "bun:test";
import {
	extractApiKey,
	generateApiKey,
	hashApiKey,
	isValidApiKeyFormat,
	normalizeOrigin,
} from "./api-keys.js";

describe("api key primitives", () => {
	it("generates scoped public and secret keys", () => {
		const publicKey = generateApiKey("public", "live");
		const secretKey = generateApiKey("secret", "test");
		expect(publicKey).toMatch(/^pk_live_[0-9a-f]{64}$/);
		expect(secretKey).toMatch(/^sk_test_[0-9a-f]{64}$/);
		expect(isValidApiKeyFormat(publicKey)).toBe(true);
		expect(isValidApiKeyFormat("pk_live_not-a-key")).toBe(false);
	});

	it("hashes keys deterministically without storing the raw value", () => {
		const key = `pk_test_${"a".repeat(64)}`;
		expect(hashApiKey(key, "secret")).toBe(hashApiKey(key, "secret"));
		expect(hashApiKey(key, "secret")).not.toBe(hashApiKey(key, "other"));
	});

	it("normalizes exact origins and rejects paths or wildcards", () => {
		expect(normalizeOrigin("example.com")).toBe("https://example.com");
		expect(normalizeOrigin("localhost:3001")).toBe("http://localhost:3001");
		expect(() => normalizeOrigin("https://example.com/docs")).toThrow();
		expect(() => normalizeOrigin("*.example.com")).toThrow();
	});
});

describe("extractApiKey", () => {
	it("reads a key from the query string, header, or bearer token", () => {
		expect(
			extractApiKey(new Request("https://api.otter.so/step?key=pk_test_a")),
		).toBe("pk_test_a");
		expect(
			extractApiKey(
				new Request("https://api.otter.so/step", {
					headers: { "x-otter-key": "pk_test_b" },
				}),
			),
		).toBe("pk_test_b");
		expect(
			extractApiKey(
				new Request("https://api.otter.so/step", {
					headers: { authorization: "Bearer pk_test_c" },
				}),
			),
		).toBe("pk_test_c");
	});

	it("returns undefined when no key is presented", () => {
		expect(extractApiKey(new Request("https://api.otter.so/step"))).toBeUndefined();
	});

	it("rejects requests presenting conflicting keys across multiple channels", () => {
		const request = new Request("https://api.otter.so/step?key=pk_test_a", {
			headers: { "x-otter-key": "pk_test_different" },
		});
		expect(extractApiKey(request)).toBeUndefined();
	});

	it("allows the same key repeated across channels", () => {
		const request = new Request("https://api.otter.so/step?key=pk_test_a", {
			headers: { "x-otter-key": "pk_test_a" },
		});
		expect(extractApiKey(request)).toBe("pk_test_a");
	});
});
