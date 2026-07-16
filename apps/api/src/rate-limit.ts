// Fixed-window counter via Redis INCR/EXPIRE — simpler than a true token
// bucket and adequate here (approximate limiting, not billing-grade
// precision). Same fail-open philosophy as safety.ts's pause store: a down
// Redis must not be able to turn into "every request 503s" — availability
// of the core agent loop matters more than this backstop when infra is
// degraded, so any Redis error or timeout lets the request through.

import type { Redis } from "otto-redis";

const RATE_LIMIT_KEY_PREFIX = "otto:ratelimit:";
const REDIS_TIMEOUT_MS = 300;

export type RateLimitResult =
	| { allowed: true }
	| { allowed: false; retryAfterSeconds: number };

function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	onTimeout: () => T,
): Promise<T> {
	return new Promise((resolve) => {
		const timer = setTimeout(() => resolve(onTimeout()), ms);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			() => {
				clearTimeout(timer);
				resolve(onTimeout());
			},
		);
	});
}

export function createRateLimiter(redis: Redis) {
	return async function checkRateLimit(
		bucket: string,
		id: string,
		limit: number,
		windowSeconds: number,
	): Promise<RateLimitResult> {
		const key = `${RATE_LIMIT_KEY_PREFIX}${bucket}:${id}`;
		const count = await withTimeout(
			redis.incr(key),
			REDIS_TIMEOUT_MS,
			() => -1,
		);
		if (count === -1) return { allowed: true }; // timed out / errored — fail open
		if (count === 1) {
			// First hit in this window — start the TTL. Best-effort: if this
			// fails the key never expires and the tenant gets stuck rate
			// limited, so a failure here is worth more than the fail-open
			// default elsewhere — but still shouldn't block the request.
			await withTimeout(
				redis.expire(key, windowSeconds),
				REDIS_TIMEOUT_MS,
				() => 0,
			);
		}
		if (count > limit) {
			const ttl = await withTimeout(
				redis.ttl(key),
				REDIS_TIMEOUT_MS,
				() => windowSeconds,
			);
			return {
				allowed: false,
				retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
			};
		}
		return { allowed: true };
	};
}
