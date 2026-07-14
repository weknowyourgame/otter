import { describe, expect, it } from "bun:test";
import {
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
