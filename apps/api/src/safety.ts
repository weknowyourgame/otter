// Experimental

import type { PauseStore } from "otto-core";
import type { Redis } from "otto-redis";

const PAUSE_KEY_PREFIX = "otto:paused:";
const DEFAULT_PAUSE_MINUTES = 15;

// isPaused sits on every single /step and /ws call, unlike the BullMQ
// connection (which only matters for the web-crawl queue) — so unlike
// otto-redis's default connection options (maxRetriesPerRequest: null,
// tuned for BullMQ's infinite-retry expectations), a down Redis must not be
// able to hang every step request forever. Bounded timeout, fail open
// (treat as not-paused) rather than fail closed, since availability of the
// core agent loop matters more than this backstop when infra is degraded —
// the SDK's client-side Stop button is the safety net that must always work.
const ISPAUSED_TIMEOUT_MS = 300;
// pause()/resume() are meant to reject quickly on a down Redis so index.ts's
// routes can return a 503 — but discovered by actually testing this with
// Redis stopped mid-session that they DIDN'T: otto-redis's connection sets
// maxRetriesPerRequest: null (correct for BullMQ, which wants infinite
// retry), so an unreachable command just queues forever instead of ever
// rejecting. The request hung for the full 10s Bun.serve idleTimeout instead
// of failing fast. Same bounded-timeout treatment as isPaused, just
// rejecting instead of falling back, since these two must not silently
// pretend to succeed.
const WRITE_TIMEOUT_MS = 1000;

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => T | never): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			try {
				resolve(onTimeout());
			} catch (error) {
				reject(error);
			}
		}, ms);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});
}

export function createRedisPauseStore(redis: Redis): PauseStore {
	const key = (sessionId: string) => `${PAUSE_KEY_PREFIX}${sessionId}`;

	return {
		async isPaused(sessionId) {
			return withTimeout(
				redis.get(key(sessionId)).then((v) => v !== null),
				ISPAUSED_TIMEOUT_MS,
				() => false,
			);
		},
		async pause(sessionId, durationMs) {
			await withTimeout(redis.set(key(sessionId), "1", "PX", durationMs), WRITE_TIMEOUT_MS, () => {
				throw new Error("pause_store_unreachable");
			});
		},
		async resume(sessionId) {
			await withTimeout(redis.del(key(sessionId)), WRITE_TIMEOUT_MS, () => {
				throw new Error("pause_store_unreachable");
			});
		},
	};
}

export { DEFAULT_PAUSE_MINUTES };
