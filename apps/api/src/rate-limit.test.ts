import { describe, expect, it } from "bun:test";
import type { Redis } from "otter-redis";
import { createRateLimiter } from "./rate-limit.js";

/** In-memory stand-in for the handful of ioredis commands checkRateLimit uses. */
class FakeRedis {
	private counts = new Map<string, number>();
	private ttls = new Map<string, number>();

	async incr(key: string): Promise<number> {
		const next = (this.counts.get(key) ?? 0) + 1;
		this.counts.set(key, next);
		return next;
	}

	async expire(key: string, seconds: number): Promise<number> {
		this.ttls.set(key, seconds);
		return 1;
	}

	async ttl(key: string): Promise<number> {
		return this.ttls.get(key) ?? -1;
	}
}

/** Every command rejects, simulating an unreachable Redis. */
class BrokenRedis {
	async incr(): Promise<number> {
		throw new Error("connection refused");
	}
	async expire(): Promise<number> {
		throw new Error("connection refused");
	}
	async ttl(): Promise<number> {
		throw new Error("connection refused");
	}
}

describe("createRateLimiter", () => {
	it("allows requests up to the limit, then blocks with a retry-after", async () => {
		const checkRateLimit = createRateLimiter(
			new FakeRedis() as unknown as Redis,
		);
		for (let i = 0; i < 3; i++) {
			const result = await checkRateLimit("test", "key-a", 3, 60);
			expect(result.allowed).toBe(true);
		}
		const blocked = await checkRateLimit("test", "key-a", 3, 60);
		expect(blocked.allowed).toBe(false);
		if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
	});

	it("scopes limits independently per bucket and id", async () => {
		const checkRateLimit = createRateLimiter(
			new FakeRedis() as unknown as Redis,
		);
		await checkRateLimit("dashboard", "user-1", 1, 60);
		const stillAllowedOtherUser = await checkRateLimit(
			"dashboard",
			"user-2",
			1,
			60,
		);
		const stillAllowedOtherBucket = await checkRateLimit(
			"agent-key",
			"user-1",
			1,
			60,
		);
		expect(stillAllowedOtherUser.allowed).toBe(true);
		expect(stillAllowedOtherBucket.allowed).toBe(true);
	});

	it("fails open when Redis is unreachable", async () => {
		const checkRateLimit = createRateLimiter(
			new BrokenRedis() as unknown as Redis,
		);
		const result = await checkRateLimit("test", "key-b", 1, 60);
		expect(result.allowed).toBe(true);
	});
});
